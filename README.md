# social-media-REST

## Tech Stack

- Node Js
- Express
- MongoDB

# Environment Variables

```
JWT_SECRET=SECRED_KEY_FOR_JWT
MONGODB_URL_DEV=MONGODB_SERVER_URL
PORT=3000
```

# API Docs

### User Routes

#### Authorization Header

`Bearer <token>`

| Route                       | Method | Description                                                           |
| :-------------------------- | :----- | :-------------------------------------------------------------------- |
| /users                      | GET    | Returns a message: "User Router"                                      |
| /users                      | POST   | Creates a new user and returns user details with authentication token |
| /users/login                | POST   | Authenticates user and returns user details with authentication token |
| /users/me                   | GET    | Returns the authenticated user's details                              |
| /users/me                   | PATCH  | Updates the authenticated user's details                              |
| /users/me/change-password   | PATCH  | Updates the authenticated user's password                             |
| /users/me/liked             | GET    | Returns the posts liked by the authenticated user                     |
| /users/:username            | GET    | Returns the user details with the given username                      |
| /users/:username/followers  | GET    | Returns the followers of the user with the given username             |
| /users/:username/followings | GET    | Returns the users followed by the user with the given username        |
| /users/:username/follow     | POST   | Follows the user with the given username                              |
| /users/:username/unfollow   | DELETE | Unfollows the user with the given username                            |
| /users/logout               | POST   | Logs out the authenticated user from the current session              |
| /users/logoutall            | POST   | Logs out the authenticated user from all sessions                     |
| /users/me                   | DELETE | Deletes the authenticated user's account                              |

### POST Routes

#### Authorization Header

`Bearer <token>`

| Method | Endpoint          | Description                                 |
| ------ | ----------------- | ------------------------------------------- |
| POST   | /posts            | Create a new post                           |
| GET    | /posts            | Get all posts created by authenticated user |
| GET    | /posts/:id        | Get a post by ID                            |
| PATCH  | /posts/:id        | Update a post by ID                         |
| DELETE | /posts/:id        | Delete a post by ID                         |
| POST   | /posts/:id/like   | Like a post by ID                           |
| POST   | /posts/:id/unlike | Unlike a post by ID                         |
| GET    | /posts/:id/likes  | Get all likes of a post by ID               |
