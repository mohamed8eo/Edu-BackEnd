# API Documentation

This document provides a detailed overview of all the API endpoints for the eduBackend application.

## App Module

### `GET /`

- **Description:** Returns a "Hello World!" message. This is a public endpoint.
- **Authentication:** None
- **Request:**
    - **Body:** None
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```
        Hello World!
        ```

---

## Auth Module

The following endpoints are available under the `/auth` prefix.

### `POST /auth/sign-up`

- **Description:** Registers a new user.
- **Authentication:** Public
- **Request Body:**
    ```json
    {
      "name": "string",
      "bio": "string (optional)",
      "email": "string (email format)",
      "password": "string (4-12 characters)"
    }
    ```
- **Response:**
    - **Status:** `201 Created`
    - **Body:**
        ```json
        {
          "message": "User created successfully!",
          "accessToken": "string (jwt)",
          "refresh_token": "string (jwt)"
        }
        ```
- **Errors:**
    - `409 Conflict`: If the email already exists.

### `POST /auth/login`

- **Description:** Logs in an existing user.
- **Authentication:** Public
- **Request Body:**
    ```json
    {
      "email": "string (email format)",
      "password": "string (4-12 characters)"
    }
    ```
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "accessToken": "string (jwt)",
          "refresh_token": "string (jwt)"
        }
        ```
- **Errors:**
    - `400 Bad Request`: If email or password are incorrect.

### `POST /auth/sign-out`

- **Description:** Logs out a user by invalidating their refresh token.
- **Authentication:** Requires a valid refresh token.
- **Request:**
    - The refresh token is sent via a secure cookie.
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "message": "Sign Out Successfully!"
        }
        ```

### `POST /auth/refresh`

- **Description:** Refreshes the access token using a valid refresh token.
- **Authentication:** Requires a valid refresh token.
- **Request:**
    - The refresh token is sent via a secure cookie.
- **Response:**
    - **Status:** `200 OK`
    - **Body:** (If refresh token is not expiring soon)
        ```json
        {
          "access_token": "string (jwt)"
        }
        ```
    - **Body:** (If refresh token is expiring soon, it will be rotated)
        ```json
        {
          "access_token": "string (jwt)",
          "refresh_token": "string (jwt)"
        }
        ```
- **Errors:**
    - `401 Unauthorized`: If the refresh token is invalid or not present.

### `GET /auth/google/login`

- **Description:** Initiates the Google OAuth2 authentication flow. The user will be redirected to Google's login page.
- **Authentication:** Public

### `GET /auth/google/callback`

- **Description:** Callback URL for Google OAuth2. Handles the user data from Google, creates or logs in the user, and redirects to the frontend with an access token in the query parameter.
- **Authentication:** Public
- **Redirects to:** `http://localhost:5000?token=<access_token>`

### `GET /auth/github/login`

- **Description:** Initiates the GitHub OAuth2 authentication flow. The user will be redirected to GitHub's login page.
- **Authentication:** Public

### `GET /auth/github/callback`

- **Description:** Callback URL for GitHub OAuth2. Handles the user data from GitHub, creates or logs in the user, and redirects to the frontend with an access token in the query parameter.
- **Authentication:** Public
- **Redirects to:** `http://localhost:5000?token=<access_token>`

---

## Categorie Module

The following endpoints are available under the `/categorie` prefix.

### `POST /categorie`

- **Description:** Adds a new category.
- **Authentication:** Admin Only
- **Request Body:**
    ```json
    {
      "name": "string",
      "image": "string (url)",
      "description": "string",
      "parentId": "string (optional)"
    }
    ```
- **Response:**
    - **Status:** `201 Created`
    - **Body:**
        ```json
        {
          "message": "Category added successfully",
          "categorieId": "string"
        }
        ```
- **Errors:**
    - `409 Conflict`: If the category name already exists or the parent category is not found.

### `PATCH /categorie/update/:slug`

- **Description:** Updates an existing category.
- **Authentication:** Admin Only
- **URL Params:**
    - `slug`: The slug of the category to update.
- **Request Body:**
    ```json
    {
      "name": "string (optional)",
      "image": "string (url, optional)",
      "description": "string (optional)",
      "parentId": "string (optional)"
    }
    ```
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "message": "Category updated successfully",
          "result": { ...category object }
        }
        ```

### `DELETE /categorie/delete/:slug`

- **Description:** Deletes a category.
- **Authentication:** Admin Only
- **URL Params:**
    - `slug`: The slug of the category to delete.
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "message": "Category deleted successfully"
        }
        ```

### `GET /categorie/tree`

- **Description:** Retrieves the full category tree, including nested children and associated courses.
- **Authentication:** Public
- **Response:**
    - **Status:** `200 OK`
    - **Body:** An array of root category nodes.

### `GET /categorie/:slug`

- **Description:** Retrieves a single category by its slug.
- **Authentication:** Public
- **URL Params:**
    - `slug`: The slug of the category.
- **Response:**
    - **Status:** `200 OK`
    - **Body:** An array containing the category object.

### `GET /categorie/:slug/children`

- **Description:** Retrieves the direct children of a parent category.
- **Authentication:** Public
- **URL Params:**
    - `slug`: The slug of the parent category.
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "parent": { ...parent category object },
          "children": [ ...child category objects ]
        }
        ```

### `GET /categorie`

- **Description:** Retrieves all parent categories (categories without a `parentId`).
- **Authentication:** Public
- **Response:**
    - **Status:** `200 OK`
    - **Body:** An array of parent category objects.

### `GET /categorie/:slug/courses`

- **Description:** Retrieves all courses associated with a specific category.
- **Authentication:** Public
- **URL Params:**
    - `slug`: The slug of the category.
- **Response:**
    - **Status:** `200 OK`
    - **Body:** An array of course objects.

---

## Course Module

The following endpoints are available under the `/course` prefix.

### `POST /course`

- **Description:** Creates a new course. Can fetch lessons from a YouTube playlist or video.
- **Authentication:** Admin Only
- **Request Body:**
    ```json
    {
      "title": "string",
      "description": "string",
      "instructorId": "string",
      "thumbnail": "string (url)",
      "level": "string",
      "language": "string",
      "categoryIds": ["string"],
      "youtubePlaylistURL": "string (optional)"
    }
    ```
- **Response:**
    - **Status:** `201 Created`
    - **Body:**
        ```json
        {
          "message": "Course created successfully",
          "id": "string",
          "slug": "string"
        }
        ```
- **Errors:**
    - `400 Bad Request`: If the instructor is not found.
    - `409 Conflict`: If the course title already exists.

### `GET /course/all`

- **Description:** Retrieves all courses.
- **Authentication:** Public
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "message": "Courses found",
          "courses": [ ...course objects ]
        }
        ```

### `PATCH /course/update/:slug`

- **Description:** Updates an existing course.
- **Authentication:** Admin Only
- **URL Params:**
    - `slug`: The slug of the course to update.
- **Request Body:**
    ```json
    {
      "title": "string (optional)",
      "description": "string (optional)",
      "thumbnail": "string (url, optional)",
      "level": "string (optional)",
      "language": "string (optional)",
      "categoryIds": ["string", "optional"]
    }
    ```
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "message": "Course updated successfully",
          "id": "string",
          "slug": "string"
        }
        ```

### `DELETE /course/delete/:slug`

- **Description:** Deletes a course.
- **Authentication:** Admin Only
- **URL Params:**
    - `slug`: The slug of the course to delete.
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "message": "Course deleted successfully"
        }
        ```

### `GET /course/search`

- **Description:** Searches for courses by a query string in the title or description.
- **Authentication:** Public
- **Query Params:**
    - `query`: The search term.
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "message": "Courses found",
          "courses": [ ...course objects ]
        }
        ```

### `GET /course/:slug`

- **Description:** Retrieves a single course by its slug.
- **Authentication:** Public
- **URL Params:**
    - `slug`: The slug of the course.
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "message": "Course found",
          "course": { ...course object }
        }
        ```

### `GET /course/:slug/lessons`

- **Description:** Retrieves all lessons for a specific course.
- **Authentication:** Public
- **URL Params:**
    - `slug`: The slug of the course.
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "message": "Lessons found",
          "lessons": [ ...lesson objects ]
        }
        ```

### `POST /course/:slug/lessons/:lessonId/progress`

- **Description:** Marks a lesson as completed or not completed for the current user.
- **Authentication:** Requires a logged-in user.
- **URL Params:**
    - `slug`: The slug of the course.
    - `lessonId`: The ID of the lesson.
- **Request Body:**
    ```json
    {
      "completed": "boolean"
    }
    ```
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "lessonId": "string",
          "courseId": "string",
          "lessonCompleted": "boolean",
          "courseProgress": "number",
          "courseStatus": "string"
        }
        ```

### `GET /course/:slug/lessons/progress`

- **Description:** Retrieves the progress of all lessons for the current user in a specific course.
- **Authentication:** Requires a logged-in user.
- **URL Params:**
    - `slug`: The slug of the course.
- **Response:**
    - **Status:** `200 OK`
    - **Body:** An array of lesson progress objects.

### `GET /course/random/:limit`

- **Description:** Retrieves a random number of courses.
- **Authentication:** Public
- **URL Params:**
    - `limit`: The number of random courses to retrieve.
- **Response:**
    - **Status:** `200 OK`
    - **Body:** An array of course objects.

---

## Admin/Traffic Module

The following endpoints are available under the `/admin` prefix and are for Admin users only.

### `GET /admin/traffic/daily`

- **Description:** Retrieves the daily traffic (number of requests per day).
- **Authentication:** Admin Only
- **Response:**
    - **Status:** `200 OK`
    - **Body:** An array of objects with `day` and `requests`.

### `GET /admin/traffic/top-endpoints`

- **Description:** Retrieves the top 10 most requested endpoints.
- **Authentication:** Admin Only
- **Response:**
    - **Status:** `200 OK`
    - **Body:** An array of objects with `path`, `method`, `statusCode`, `hits`, and `averageDuration`.

### `GET /admin/traffic/slow-endpoints`

- **Description:** Retrieves the top 10 slowest endpoints with at least 10 hits.
- **Authentication:** Admin Only
- **Response:**
    - **Status:** `200 OK`
    - **Body:** An array of objects with `path`, `method`, `statusCode`, `hits`, and `averageDuration`.

### `GET /admin/traffic/error-stats`

- **Description:** Retrieves statistics on HTTP status codes.
- **Authentication:** Admin Only
- **Response:**
    - **Status:** `200 OK`
    - **Body:** An array of objects with `statusCode` and `count`.

### `GET /admin/user/:id`

- **Description:** Retrieves information about a specific user.
- **Authentication:** Admin Only
- **URL Params:**
    - `id`: The ID of the user.
- **Response:**
    - **Status:** `200 OK`
    - **Body:** A user object.

### `GET /admin/traffic/dashboard-stats`

- **Description:** Retrieves aggregated statistics for the admin dashboard.
- **Authentication:** Admin Only
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "totalRequests": "number",
          "errorRequests": "number",
          "errorRate": "number",
          "averageResponseTime": "number",
          "activeUsers": "number",
          "totalUsers": "number"
        }
        ```

### `GET /admin/all-users`

- **Description:** Retrieves all users with pagination.
- **Authentication:** Admin Only
- **Query Params:**
    - `page`: The page number (optional, default: 1).
    - `limit`: The number of users per page (optional, default: 10).
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "data": [ ...user objects ],
          "pagination": {
            "page": "number",
            "limit": "number",
            "total": "number",
            "totalPages": "number"
          }
        }
        ```

---

## User Module

The following endpoints are available under the `/user` prefix.

### `GET /user/me`

- **Description:** Retrieves the account information for the currently logged-in user.
- **Authentication:** Requires a logged-in user.
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "UserAccount": { ...user object }
        }
        ```

### `PATCH /user/me/update`

- **Description:** Updates the profile of the currently logged-in user.
- **Authentication:** Requires a logged-in user.
- **Request Body:**
    ```json
    {
      "name": "string (optional)",
      "image": "string (url, optional)",
      "bio": "string (2-13 characters, optional)",
      "email": "string (email format, optional)"
    }
    ```
- **Response:**
    - **Status:** `200 OK`
    - **Body:**
        ```json
        {
          "message": "User updated successfully",
          "user": { ...user object }
        }
        ```
- **Errors:**
    - `400 Bad Request`: If no fields are provided to update.
    - `409 Conflict`: If the new email is already in use.
