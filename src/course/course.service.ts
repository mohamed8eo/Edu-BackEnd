/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import slugify from 'slugify';
import { db } from '../db';
import {
  lessons,
  courseCategories,
  courses,
  userCourses,
  lessonProgress,
  instructors,
} from '../db/schema';
import { eq, or, ilike, and, sql, getTableColumns } from 'drizzle-orm';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

const YT_API_KEY = process.env.YT_API_KEY;

@Injectable()
export class CourseService {
  async createCourse(dto: CreateCourseDto) {
    const slug = slugify(dto.title, { lower: true, strict: true });

    // Verify instructor exists
    const [instructor] = await db
      .select({ id: instructors.id })
      .from(instructors)
      .where(eq(instructors.id, dto.instructorId))
      .limit(1);

    if (!instructor) {
      throw new BadRequestException('Instructor not found');
    }

    // Prevent duplicate course
    const exists = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.slug, slug));

    if (exists.length) {
      throw new ConflictException('Course already exists');
    }

    // Resolve YouTube source
    let youtubePlaylistId: string | null = null;
    let lessonsPayload: {
      videoId: string;
      title: string;
      duration?: number; // Changed to number (seconds)
      thumbnail?: string;
    }[] = [];

    const parsed = this.parseYoutubeUrl(dto.youtubePlaylistURL || '');
    let candidateId = parsed?.id;
    console.log(candidateId);

    if (candidateId) {
      const playlistVideos = await this.fetchPlaylistVideos(candidateId);
      if (playlistVideos.length > 0) {
        youtubePlaylistId = candidateId;
        lessonsPayload = playlistVideos;
      } else {
        const video = await this.fetchSingleVideo(candidateId);
        if (video) {
          lessonsPayload = [video];
        }
      }
    }

    // Create course
    const [course] = await db
      .insert(courses)
      .values({
        title: dto.title,
        slug,
        description: dto.description,
        thumbnail: dto.thumbnail,
        level: dto.level as 'beginner' | 'intermediate' | 'advanced' | 'all_levels',
        language: dto.language as 'english' | 'spanish' | 'french' | 'german' | 'arabic' | 'chinese' | 'japanese' | 'portuguese' | 'russian' | 'hindi',
        youtubePlaylistId,
        instructorId: dto.instructorId, // ✅ Get from DTO
      })
      .returning();

    // Attach categories
    if (dto.categoryIds?.length) {
      await db.insert(courseCategories).values(
        dto.categoryIds.map((categoryId) => ({
          courseId: course.id,
          categoryId,
        })),
      );
    }

    // Create lessons
    if (lessonsPayload.length) {
      await db.insert(lessons).values(
        lessonsPayload.map((l, index) => ({
          courseId: course.id,
          title: l.title,
          youtubeVideoId: l.videoId,
          thumbnail: l.thumbnail,
          position: index,
          duration: l.duration ?? null, // Now a number (seconds)
        })),
      );
    }

    return {
      message: 'Course created successfully',
      id: course.id,
      slug: course.slug,
    };
  }

  async updateCourse(slug: string, updateCourse: UpdateCourseDto) {
    // Check if it exists
    await this.getCourse(slug);

    const { title, description, thumbnail, level, language, categoryIds } =
      updateCourse;

    const slugUpdate = slugify(title, { lower: true, strict: true });

    const [updatedCourse] = await db
      .update(courses)
      .set({
        title,
        slug: slugUpdate,
        description,
        thumbnail,
        level: level as 'beginner' | 'intermediate' | 'advanced' | 'all_levels' | undefined,
        language: language as 'english' | 'spanish' | 'french' | 'german' | 'arabic' | 'chinese' | 'japanese' | 'portuguese' | 'russian' | 'hindi' | undefined,
      })
      .where(eq(courses.slug, slug))
      .returning();

    if (categoryIds?.length) {
      await db
        .delete(courseCategories)
        .where(eq(courseCategories.courseId, updatedCourse.id));
      await db.insert(courseCategories).values(
        categoryIds.map((categoryId) => ({
          courseId: updatedCourse.id,
          categoryId,
        })),
      );
    }

    return {
      message: 'Course updated successfully',
      id: updatedCourse.id,
      slug: updatedCourse.slug,
    };
  }

  async deleteCourse(slug: string) {
    const course = await this.getCourse(slug);
    if (!course) throw new NotFoundException('Course not found');
    await db.delete(courses).where(eq(courses.slug, slug));

    return {
      message: 'Course deleted successfully',
    };
  }

  // Search query
  async searchCourses(query: string) {
    const coursesInfo = await db
      .select()
      .from(courses)
      .where(
        or(
          ilike(courses.title, `%${query}%`),
          ilike(courses.description, `%${query}%`),
        ),
      );

    if (coursesInfo.length === 0) {
      return {
        message: 'No courses found',
      };
    }
    return {
      message: 'Courses found',
      courses: coursesInfo,
    };
  }

  async getCourse(slug: string) {
    const courseInfo = await db
      .select()
      .from(courses)
      .where(eq(courses.slug, slug));

    if (courseInfo.length === 0)
      throw new NotFoundException('Course not found');

    return {
      message: 'Course found',
      course: courseInfo[0],
    };
  }

  async getAllcourses() {
    const coursesInfo = await db
      .select({
        ...getTableColumns(courses),
        totalSeconds: sql<number>`
          COALESCE(SUM(${lessons.duration}), 0)
        `.as('totalSeconds'),
      })
      .from(courses)
      .leftJoin(lessons, eq(lessons.courseId, courses.id))
      .groupBy(courses.id);

    if (coursesInfo.length === 0) {
      throw new NotFoundException('Courses not found');
    }

    return {
      message: 'Courses found',
      courses: coursesInfo.map(({ totalSeconds, ...course }) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        return {
          ...course,
          totalDuration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        };
      }),
    };
  }

  async getCourseLessons(slug: string) {
    const courseId = await db
      .select({
        id: courses.id,
      })
      .from(courses)
      .where(eq(courses.slug, slug))
      .limit(1);

    if (courseId.length === 0) {
      throw new NotFoundException('Course not found');
    }

    const lessonsInfo = await db
      .select()
      .from(lessons)
      .where(eq(lessons.courseId, courseId[0].id));

    if (lessonsInfo.length === 0) {
      throw new NotFoundException('Lessons not found');
    }

    return {
      message: 'Lessons found',
      lessons: lessonsInfo,
    };
  }

  // YOUTUBE SOURCE RESOLUTION
  private parseYoutubeUrl(url: string) {
    try {
      const parsed = new URL(url);

      if (parsed.searchParams.has('list')) {
        return {
          type: 'playlist' as const,
          id: parsed.searchParams.get('list')!,
        };
      }

      if (parsed.searchParams.has('v')) {
        return {
          type: 'video' as const,
          id: parsed.searchParams.get('v')!,
        };
      }

      if (parsed.hostname === 'youtu.be') {
        return {
          type: 'video' as const,
          id: parsed.pathname.slice(1),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  // YOUTUBE API
  private async fetchPlaylistVideos(playlistId: string) {
    const BASE = 'https://www.googleapis.com/youtube/v3/playlistItems';
    const VIDEOS_BASE = 'https://www.googleapis.com/youtube/v3/videos';

    let videos: any[] = [];
    let pageToken: string | null = null;

    do {
      const url =
        `${BASE}?part=snippet,contentDetails` +
        `&playlistId=${playlistId}` +
        `&maxResults=50` +
        (pageToken ? `&pageToken=${pageToken}` : '') +
        `&key=${YT_API_KEY}`;

      const res = await fetch(url);
      if (!res.ok) break;

      const data = await res.json();
      const items = data.items || [];

      if (items.length > 0) {
        // Fetch durations for these videos
        const videoIds = items
          .map((item: any) => item.contentDetails.videoId)
          .join(',');

        const videosUrl = `${VIDEOS_BASE}?part=contentDetails&id=${videoIds}&key=${YT_API_KEY}`;
        const videosRes = await fetch(videosUrl);
        const videosData = videosRes.ok ? await videosRes.json() : {};
        const durationMap = new Map<string, number>();

        videosData.items?.forEach((v: any) => {
          durationMap.set(v.id, this.parseDurationToSeconds(v.contentDetails.duration));
        });

        videos.push(
          ...items.map((item: any) => ({
            videoId: item.contentDetails.videoId,
            title: item.snippet.title,
            duration: durationMap.get(item.contentDetails.videoId),
            thumbnail: item.snippet.thumbnails?.medium?.url,
          })),
        );
      }

      pageToken = data.nextPageToken ?? null;
    } while (pageToken);

    return videos;
  }

  private async fetchSingleVideo(videoId: string) {
    const url =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=snippet,contentDetails&id=${videoId}&key=${YT_API_KEY}`;

    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.items?.length) return null;

    const v = data.items[0];
    return {
      videoId: v.id,
      title: v.snippet.title,
      duration: this.parseDurationToSeconds(v.contentDetails.duration),
      thumbnail: v.snippet.thumbnails?.medium?.url,
    };
  }

  /**
   * Parse YouTube ISO 8601 duration (PT1H2M3S) to seconds
   */
  private parseDurationToSeconds(pt: string | undefined | null): number {
    if (!pt) return 0;
    const match = pt.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Format seconds to display format (HH:MM:SS or MM:SS)
   */
  private formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  async markLessonProgress(
    userId: string,
    courseId: string,
    lessonId: string,
    completed = true,
  ) {
    return await db.transaction(async (tx) => {
      // 1️⃣ Check enrollment
      const [enrollment] = await tx
        .select({ userId: userCourses.userId })
        .from(userCourses)
        .where(
          and(
            eq(userCourses.userId, userId),
            eq(userCourses.courseId, courseId),
          ),
        );

      if (!enrollment) {
        throw new ForbiddenException('You are not enrolled in this course.');
      }

      // 2️⃣ Check lesson exists in course
      const [lesson] = await tx
        .select()
        .from(lessons)
        .where(and(eq(lessons.id, lessonId), eq(lessons.courseId, courseId)))
        .limit(1);

      if (!lesson)
        throw new NotFoundException('Lesson not found in this course');

      // 3️⃣ Upsert lesson progress
      await tx
        .insert(lessonProgress)
        .values({
          userId,
          lessonId,
          completed,
          completedAt: completed ? new Date() : null,
        })
        .onConflictDoUpdate({
          target: [lessonProgress.userId, lessonProgress.lessonId],
          set: {
            completed,
            completedAt: completed ? new Date() : null,
          },
        });

      // 4️⃣ Compute course progress
      const totalLessonsResult = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(lessons)
        .where(eq(lessons.courseId, courseId));
      const totalLessons = totalLessonsResult[0].count;

      const completedLessonsResult = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(lessonProgress)
        .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
        .where(
          and(
            eq(lessonProgress.userId, userId),
            eq(lessons.courseId, courseId),
            eq(lessonProgress.completed, true),
          ),
        );
      const completedLessons = completedLessonsResult[0].count;

      const progress =
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0;

      // 5️⃣ Update course enrollment
      await tx
        .update(userCourses)
        .set({
          progress,
          status: progress === 100 ? 'completed' : 'active',
          completedAt: progress === 100 ? new Date() : null,
        })
        .where(
          and(
            eq(userCourses.userId, userId),
            eq(userCourses.courseId, courseId),
          ),
        );

      // 6️⃣ Return response
      return {
        lessonId,
        courseId,
        lessonCompleted: completed,
        courseProgress: progress,
        courseStatus: progress === 100 ? 'completed' : 'active',
      };
    });
  }

  async getProgressLessonsForUserInCourse(userId: string, slug: string) {
    // Retrieve all progress lessons for the user in the course
    const progressLessons = await db
      .select(getTableColumns(lessonProgress))
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
      .innerJoin(courses, eq(lessons.courseId, courses.id))
      .where(and(eq(lessonProgress.userId, userId), eq(courses.slug, slug)));

    if (progressLessons.length === 0) {
      throw new NotFoundException(
        'No progress lessons found for the user in the course',
      );
    }

    return progressLessons;
  }

  // Get random 4 courses
  async getRandomCourses(limit: number) {
    try {
      const randomCourses = await db
        .select({
          ...getTableColumns(courses),
          totalSeconds: sql<number>`
            COALESCE(SUM(${lessons.duration}), 0)
          `.as('totalSeconds'),
        })
        .from(courses)
        .leftJoin(lessons, eq(lessons.courseId, courses.id))
        .groupBy(courses.id)
        .orderBy(sql`random()`)
        .limit(limit);

      if (randomCourses === null || randomCourses.length === 0) {
        throw new NotFoundException('No courses found');
      }

      return randomCourses.map(({ totalSeconds, ...course }) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        return {
          ...course,
          totalDuration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
        };
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      } else if (error instanceof TypeError) {
        throw new InternalServerErrorException('Null pointer reference', error);
      } else if (error instanceof Error) {
        throw new InternalServerErrorException('Unhandled exception', error);
      } else {
        throw new InternalServerErrorException('Unknown error', error);
      }
    }
  }
}
