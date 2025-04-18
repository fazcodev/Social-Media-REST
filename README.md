# SnapMedia Backend (REST API)

This is the REST API backend for SnapMedia, a social media platform. It provides endpoints for user authentication, profile management, posts, feeds, and exploration features. Built with Node.js, Express, and Mongoose, it interacts with MongoDB for data persistence.

## API Routes

### User Routes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/users` | Get users list |
| `POST` | `/users` | Create new user (Sign up) |
| `POST` | `/users/oauth-login` | Authenticate user via OAuth |
| `POST` | `/users/login` | Authenticate user (Login) |
| `GET` | `/users/me` | Get current authenticated user profile |
| `PATCH` | `/users/me` | Update current user profile details |
| `POST` | `/users/me/avatar` | Upload or update user avatar |
| `GET` | `/users/me/user-suggestions` | Get suggestions of users to follow |
| `GET` | `/users/search` | Search for other users |
| `PATCH` | `/users/me/change-password` | Change authenticated user's password |
| `GET` | `/users/me/liked` | Get list of posts liked by current user |
| `GET` | `/users/:username` | Find and retrieve user by username |
| `GET` | `/users/:username/followers` | Get followers list for a specific user |
| `GET` | `/users/:username/followings` | Get followings list for a specific user |
| `POST` | `/users/:username/follow` | Follow a specific user |
| `DELETE` | `/users/:username/unfollow` | Unfollow a specific user |
| `POST` | `/users/logout` | Logout from current session |
| `POST` | `/users/logoutall` | Logout from all active sessions |
| `DELETE` | `/users/me` | Delete current user account |

### Post Routes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/posts` | Create a new post |
| `GET` | `/:username/posts` | Get all posts authored by a specific user |
| `GET` | `/posts/:id` | Get details of a specific post |
| `PATCH` | `/posts/:id` | Update an existing post |
| `DELETE` | `/posts/:id` | Delete a specific post |
| `POST` | `/posts/:id/like` | Like a specific post |
| `POST` | `/posts/:id/unlike` | Unlike a specific post |
| `GET` | `/posts/:id/likes` | Get all likes for a post |
| `GET` | `/posts/:id/comments` | Get all comments on a post |
| `POST` | `/posts/:id/comment` | Add a comment to a post |
| `DELETE` | `/posts/:id/comment/:commentId` | Delete a specific comment from a post |
| `GET` | `/posts/:username/saved` | Get saved posts for a user |
| `POST` | `/posts/:id/save` | Save a post to bookmarks |
| `DELETE` | `/posts/:id/unsave` | Remove a post from bookmarks |

### Feed & Explore Routes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/feeds` | Retrieve user interaction and subscription feeds |
| `GET` | `/explore` | Explore random and trending posts |
