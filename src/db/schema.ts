import { relations, sql } from 'drizzle-orm';
import { primaryKey, check } from 'drizzle-orm/pg-core';
import { integer, varchar, boolean } from 'drizzle-orm/pg-core';
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  decimal,
} from 'drizzle-orm/pg-core';

/* =========================
   ENUMS
========================= */

export const Roles = pgEnum('role', ['user', 'admin']);

export const CourseLevels = pgEnum('course_level', [
  'beginner',
  'intermediate',
  'advanced',
  'all_levels',
]);

export const Languages = pgEnum('language', [
  'english',
  'spanish',
  'french',
  'german',
  'arabic',
  'chinese',
  'japanese',
  'portuguese',
  'russian',
  'hindi',
]);

export const CourseStatus = pgEnum('course_status', [
  'active',
  'completed',
  'dropped',
]);

/* =========================
   TABLES
========================= */

// User table
export const user = pgTable('user', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  role: Roles('role').notNull().default('user'),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  image: text('image'),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Instructors table - Separate profile for course creators
export const instructors = pgTable(
  'instructors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    title: varchar('title', { length: 255 }), // e.g., "Senior Software Engineer", "PhD in Mathematics"
    bio: text('bio'),
    expertise: text('expertise'), // Areas of expertise as JSON or comma-separated
    profileImage: varchar('profile_image', { length: 500 }),
    website: varchar('website', { length: 500 }),
    linkedIn: varchar('linked_in', { length: 500 }),
    twitter: varchar('twitter', { length: 255 }),
    github: varchar('github', { length: 255 }),
    totalStudents: integer('total_students').default(0).notNull(),
    totalCourses: integer('total_courses').default(0).notNull(),
    averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
    isVerified: boolean('is_verified').default(false).notNull(), // Platform verified instructor
    isFeatured: boolean('is_featured').default(false).notNull(), // Featured on homepage
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    userIdIdx: index('instructors_user_id_idx').on(table.userId),
    isVerifiedIdx: index('instructors_is_verified_idx').on(table.isVerified),
    isFeaturedIdx: index('instructors_is_featured_idx').on(table.isFeatured),
  }),
);

// Refresh token table
export const refreshToken = pgTable(
  'refresh_token',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => ({
    userIdIdx: index('refresh_token_user_id_idx').on(table.userId),
    tokenIdx: index('refresh_token_token_idx').on(table.token),
    expiresAtIdx: index('refresh_token_expires_at_idx').on(table.expiresAt),
  }),
);

// Categories table
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    image: varchar('image', { length: 500 }),
    description: text('description'),
    parentId: uuid('parent_id').references(() => categories.id, {
      onDelete: 'cascade',
    }),
    isActive: boolean('is_active').default(true).notNull(),
    position: integer('position').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    slugIdx: index('categories_slug_idx').on(table.slug),
    parentIdIdx: index('categories_parent_id_idx').on(table.parentId),
    isActiveIdx: index('categories_is_active_idx').on(table.isActive),
  }),
);

// Courses table
export const courses = pgTable(
  'courses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    thumbnail: varchar('thumbnail', { length: 500 }),
    level: CourseLevels('level').notNull().default('beginner'),
    language: Languages('language').notNull().default('english'),
    youtubePlaylistId: varchar('youtube_playlist_id', { length: 100 }).unique(),
    price: decimal('price', { precision: 10, scale: 2 }).default('0.00'),
    instructorId: uuid('instructor_id')
      .notNull()
      .references(() => instructors.id, { onDelete: 'restrict' }),
    isPublished: boolean('is_published').default(false).notNull(),
    isFeatured: boolean('is_featured').default(false).notNull(),
    enrollmentCount: integer('enrollment_count').default(0).notNull(),
    averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    publishedAt: timestamp('published_at'),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    slugIdx: index('courses_slug_idx').on(table.slug),
    instructorIdIdx: index('courses_instructor_id_idx').on(table.instructorId),
    isPublishedIdx: index('courses_is_published_idx').on(table.isPublished),
    isFeaturedIdx: index('courses_is_featured_idx').on(table.isFeatured),
    levelIdx: index('courses_level_idx').on(table.level),
  }),
);

// Lessons table
export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    youtubeVideoId: varchar('youtube_video_id', { length: 100 }).notNull(),
    thumbnail: varchar('thumbnail', { length: 500 }),
    duration: integer('duration'), // Duration in seconds
    position: integer('position').notNull(),
    isPreview: boolean('is_preview').default(false).notNull(), // Free preview
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    courseIdIdx: index('lessons_course_id_idx').on(table.courseId),
    positionIdx: index('lessons_position_idx').on(table.position),
  }),
);

// Course Categories junction table
export const courseCategories = pgTable(
  'course_categories',
  {
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.courseId, t.categoryId] }),
    courseIdIdx: index('course_categories_course_idx').on(t.courseId),
    categoryIdIdx: index('course_categories_category_idx').on(t.categoryId),
  }),
);

// User Courses (Enrollments)
export const userCourses = pgTable(
  'user_courses',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    status: CourseStatus('status').notNull().default('active'),
    progress: integer('progress').default(0).notNull(), // 0-100 percentage
    enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    lastAccessedAt: timestamp('last_accessed_at'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.courseId] }),
    userIdIdx: index('user_courses_user_idx').on(t.userId),
    courseIdIdx: index('user_courses_course_idx').on(t.courseId),
    statusIdx: index('user_courses_status_idx').on(t.status),
    progressCheck: check('progress_range', sql`progress >= 0 AND progress <= 100`),
  }),
);

// Lesson Progress
export const lessonProgress = pgTable(
  'lesson_progress',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id, { onDelete: 'cascade' }),
    completed: boolean('completed').default(false).notNull(),
    watchedDuration: integer('watched_duration').default(0), // Seconds watched
    startedAt: timestamp('started_at').defaultNow().notNull(),
    completedAt: timestamp('completed_at'),
    lastWatchedAt: timestamp('last_watched_at'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.lessonId] }),
    userIdIdx: index('lesson_progress_user_idx').on(t.userId),
    lessonIdIdx: index('lesson_progress_lesson_idx').on(t.lessonId),
    completedIdx: index('lesson_progress_completed_idx').on(t.completed),
  }),
);

// Course Reviews/Ratings
export const courseReviews = pgTable(
  'course_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(), // 1-5
    review: text('review'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    courseIdIdx: index('course_reviews_course_idx').on(table.courseId),
    userIdIdx: index('course_reviews_user_idx').on(table.userId),
    ratingIdx: index('course_reviews_rating_idx').on(table.rating),
    ratingCheck: check('rating_range', sql`rating >= 1 AND rating <= 5`),
    uniqueUserCourse: index('course_reviews_unique_user_course').on(
      table.userId,
      table.courseId,
    ),
  }),
);

// Course Prerequisites
export const coursePrerequisites = pgTable(
  'course_prerequisites',
  {
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    prerequisiteCourseId: uuid('prerequisite_course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    isRequired: boolean('is_required').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.courseId, t.prerequisiteCourseId] }),
    courseIdIdx: index('course_prerequisites_course_idx').on(t.courseId),
    prerequisiteIdx: index('course_prerequisites_prereq_idx').on(
      t.prerequisiteCourseId,
    ),
  }),
);

// Traffic Logs
export const trafficLogs = pgTable(
  'traffic_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    method: text('method').notNull(),
    path: text('path').notNull(),
    statusCode: integer('status_code').notNull(),
    durationMs: integer('duration_ms').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('traffic_logs_user_id_idx').on(table.userId),
    pathIdx: index('traffic_logs_path_idx').on(table.path),
    createdAtIdx: index('traffic_logs_created_at_idx').on(table.createdAt),
  }),
);

/* =========================
   RELATIONS
========================= */

export const userRelations = relations(user, ({ one, many }) => ({
  instructorProfile: one(instructors, {
    fields: [user.id],
    references: [instructors.userId],
  }),
  refreshTokens: many(refreshToken),
  enrolledCourses: many(userCourses),
  lessonProgress: many(lessonProgress),
  courseReviews: many(courseReviews),
  trafficLogs: many(trafficLogs),
}));

export const instructorRelations = relations(instructors, ({ one, many }) => ({
  user: one(user, {
    fields: [instructors.userId],
    references: [user.id],
  }),
  courses: many(courses),
}));

export const refreshTokenRelations = relations(refreshToken, ({ one }) => ({
  user: one(user, {
    fields: [refreshToken.userId],
    references: [user.id],
  }),
}));

export const categoryRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryHierarchy',
  }),
  children: many(categories, {
    relationName: 'categoryHierarchy',
  }),
  courseCategories: many(courseCategories),
}));

export const courseRelations = relations(courses, ({ one, many }) => ({
  instructor: one(instructors, {
    fields: [courses.instructorId],
    references: [instructors.id],
  }),
  lessons: many(lessons),
  enrollments: many(userCourses),
  categories: many(courseCategories),
  reviews: many(courseReviews),
  prerequisites: many(coursePrerequisites, {
    relationName: 'coursePrerequisites',
  }),
  requiredBy: many(coursePrerequisites, {
    relationName: 'prerequisiteFor',
  }),
}));

export const lessonRelations = relations(lessons, ({ one, many }) => ({
  course: one(courses, {
    fields: [lessons.courseId],
    references: [courses.id],
  }),
  progress: many(lessonProgress),
}));

export const courseCategoryRelations = relations(
  courseCategories,
  ({ one }) => ({
    course: one(courses, {
      fields: [courseCategories.courseId],
      references: [courses.id],
    }),
    category: one(categories, {
      fields: [courseCategories.categoryId],
      references: [categories.id],
    }),
  }),
);

export const userCoursesRelations = relations(userCourses, ({ one }) => ({
  user: one(user, {
    fields: [userCourses.userId],
    references: [user.id],
  }),
  course: one(courses, {
    fields: [userCourses.courseId],
    references: [courses.id],
  }),
}));

export const lessonProgressRelations = relations(lessonProgress, ({ one }) => ({
  user: one(user, {
    fields: [lessonProgress.userId],
    references: [user.id],
  }),
  lesson: one(lessons, {
    fields: [lessonProgress.lessonId],
    references: [lessons.id],
  }),
}));

export const courseReviewRelations = relations(courseReviews, ({ one }) => ({
  course: one(courses, {
    fields: [courseReviews.courseId],
    references: [courses.id],
  }),
  user: one(user, {
    fields: [courseReviews.userId],
    references: [user.id],
  }),
}));

export const coursePrerequisiteRelations = relations(
  coursePrerequisites,
  ({ one }) => ({
    course: one(courses, {
      fields: [coursePrerequisites.courseId],
      references: [courses.id],
      relationName: 'coursePrerequisites',
    }),
    prerequisiteCourse: one(courses, {
      fields: [coursePrerequisites.prerequisiteCourseId],
      references: [courses.id],
      relationName: 'prerequisiteFor',
    }),
  }),
);

export const trafficLogsRelations = relations(trafficLogs, ({ one }) => ({
  user: one(user, {
    fields: [trafficLogs.userId],
    references: [user.id],
  }),
}));
