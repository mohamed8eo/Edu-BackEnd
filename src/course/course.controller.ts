import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
import { AdminGuard } from 'src/auth/guards/admin-guard/admin-guard.guard';
import { CurrentUser } from 'src/auth/decorator/currentUser.decorator';
import type { JwtUser } from 'src/auth/types/jwtUser';
import { Public } from 'src/auth/decorator/Public.decorator';

@Controller('course')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @UseGuards(AdminGuard)
  @Post()
  async creatCourse(@Body() createCourse: CreateCourseDto) {
    return await this.courseService.createCourse(createCourse);
  }

  @Get('all')
  async getAllCourses() {
    return await this.courseService.getAllcourses();
  }

  @UseGuards(AdminGuard)
  @Patch('update/:slug')
  async updateCourse(
    @Param('slug') slug: string,
    @Body() updateCourse: UpdateCourseDto,
  ) {
    return await this.courseService.updateCourse(slug, updateCourse);
  }

  @UseGuards(AdminGuard)
  @Delete('delete/:slug')
  async deleteCourse(@Param('slug') slug: string) {
    return await this.courseService.deleteCourse(slug);
  }

  // GET http://localhost:3000/users/search?quary=html
  @Get('search')
  async searchCourses(@Query('query') query: string) {
    return await this.courseService.searchCourses(query);
  }

  @Get(':slug')
  async getCourse(@Param('slug') slug: string) {
    return await this.courseService.getCourse(slug);
  }

  @Get(':slug/lessons')
  async getCourseLessons(@Param('slug') slug: string) {
    return await this.courseService.getCourseLessons(slug);
  }
  @Post(':slug/lessons/:lessonId/progress')
  async updateLessonProgress(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtUser,
    @Param('lessonId') lessonId: string,
    @Body() body: UpdateLessonProgressDto,
  ) {
    // Find courseId by slug
    const courseData = await this.courseService.getCourse(slug);
    const courseId = courseData.course.id;

    const { completed } = body;

    return this.courseService.markLessonProgress(
      user.userId,
      courseId,
      lessonId,
      completed,
    );
  }

  @Get(':slug/lessons/progress')
  async getProgressLessonsForUserInCourse(
    @CurrentUser() user: JwtUser,
    @Param('slug') slug: string,
  ) {
    return await this.courseService.getProgressLessonsForUserInCourse(
      user.userId,
      slug,
    );
  }

  //get Randown 4 courses
  @Public()
  @Get('random/:limit')
  async getRandomCourses(@Param('limit') limit: number) {
    return await this.courseService.getRandomCourses(limit);
  }
}
