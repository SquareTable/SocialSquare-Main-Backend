# Diff Details

Date : 2022-05-10 10:47:03

Directory c:\Users\SSBackend\Documents\GitHub\SocialSquare-Main-Backend

Total : 42 files,  946 codes, 80 comments, 39 blanks, all 1065 lines

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details

## Files
| filename | language | code | comment | blank | total |
| :--- | :--- | ---: | ---: | ---: | ---: |
| [.dockerignore](/.dockerignore) | Ignore | 1 | 0 | 0 | 1 |
| [.expo/README.md](/.expo/README.md) | Markdown | 9 | 0 | 9 | 18 |
| [.expo/settings.json](/.expo/settings.json) | JSON with Comments | 8 | 0 | 1 | 9 |
| [Dockerfile](/Dockerfile) | Docker | 7 | 1 | 0 | 8 |
| [README.md](/README.md) | Markdown | 2 | 0 | 1 | 3 |
| [api/Conversations.js](/api/Conversations.js) | JavaScript | 1,339 | 44 | 39 | 1,422 |
| [api/Feed.js](/api/Feed.js) | JavaScript | 1,520 | 143 | 18 | 1,681 |
| [api/Messages.js](/api/Messages.js) | JavaScript | 439 | 11 | 8 | 458 |
| [api/PublicApis.js](/api/PublicApis.js) | JavaScript | 321 | 25 | 13 | 359 |
| [api/User.js](/api/User.js) | JavaScript | 6,272 | 326 | 134 | 6,732 |
| [config/db.js](/config/db.js) | JavaScript | 10 | 0 | 1 | 11 |
| [docker-compose.yml](/docker-compose.yml) | YAML | 11 | 0 | 0 | 11 |
| [models/Category.js](/models/Category.js) | JavaScript | 19 | 0 | 3 | 22 |
| [models/Conversation.js](/models/Conversation.js) | JavaScript | 22 | 0 | 3 | 25 |
| [models/ImagePost.js](/models/ImagePost.js) | JavaScript | 16 | 0 | 3 | 19 |
| [models/Message.js](/models/Message.js) | JavaScript | 16 | 0 | 3 | 19 |
| [models/Poll.js](/models/Poll.js) | JavaScript | 34 | 0 | 3 | 37 |
| [models/Thread.js](/models/Thread.js) | JavaScript | 23 | 0 | 3 | 26 |
| [models/User.js](/models/User.js) | JavaScript | 22 | 0 | 3 | 25 |
| [package.json](/package.json) | JSON | 32 | 0 | 1 | 33 |
| [s3.js](/s3.js) | JavaScript | 33 | 2 | 6 | 41 |
| [server.js](/server.js) | JavaScript | 2,293 | 65 | 52 | 2,410 |
| [socketHandler.js](/socketHandler.js) | JavaScript | 158 | 3 | 13 | 174 |
| [c:\react_native\login_server\.expo\README.md](/c:%5Creact_native%5Clogin_server%5C.expo%5CREADME.md) | Markdown | -9 | 0 | -9 | -18 |
| [c:\react_native\login_server\.expo\settings.json](/c:%5Creact_native%5Clogin_server%5C.expo%5Csettings.json) | JSON with Comments | -8 | 0 | -1 | -9 |
| [c:\react_native\login_server\api\Conversations.js](/c:%5Creact_native%5Clogin_server%5Capi%5CConversations.js) | JavaScript | -1,339 | -44 | -39 | -1,422 |
| [c:\react_native\login_server\api\Feed.js](/c:%5Creact_native%5Clogin_server%5Capi%5CFeed.js) | JavaScript | -1,542 | -114 | -18 | -1,674 |
| [c:\react_native\login_server\api\Messages.js](/c:%5Creact_native%5Clogin_server%5Capi%5CMessages.js) | JavaScript | -439 | -11 | -8 | -458 |
| [c:\react_native\login_server\api\PublicApis.js](/c:%5Creact_native%5Clogin_server%5Capi%5CPublicApis.js) | JavaScript | -321 | -25 | -13 | -359 |
| [c:\react_native\login_server\api\User.js](/c:%5Creact_native%5Clogin_server%5Capi%5CUser.js) | JavaScript | -5,297 | -275 | -100 | -5,672 |
| [c:\react_native\login_server\config\db.js](/c:%5Creact_native%5Clogin_server%5Cconfig%5Cdb.js) | JavaScript | -11 | -1 | -1 | -13 |
| [c:\react_native\login_server\models\Category.js](/c:%5Creact_native%5Clogin_server%5Cmodels%5CCategory.js) | JavaScript | -19 | 0 | -3 | -22 |
| [c:\react_native\login_server\models\Conversation.js](/c:%5Creact_native%5Clogin_server%5Cmodels%5CConversation.js) | JavaScript | -22 | 0 | -3 | -25 |
| [c:\react_native\login_server\models\ImagePost.js](/c:%5Creact_native%5Clogin_server%5Cmodels%5CImagePost.js) | JavaScript | -16 | 0 | -3 | -19 |
| [c:\react_native\login_server\models\Message.js](/c:%5Creact_native%5Clogin_server%5Cmodels%5CMessage.js) | JavaScript | -16 | 0 | -3 | -19 |
| [c:\react_native\login_server\models\Poll.js](/c:%5Creact_native%5Clogin_server%5Cmodels%5CPoll.js) | JavaScript | -34 | 0 | -3 | -37 |
| [c:\react_native\login_server\models\Thread.js](/c:%5Creact_native%5Clogin_server%5Cmodels%5CThread.js) | JavaScript | -23 | 0 | -3 | -26 |
| [c:\react_native\login_server\models\User.js](/c:%5Creact_native%5Clogin_server%5Cmodels%5CUser.js) | JavaScript | -18 | 0 | -3 | -21 |
| [c:\react_native\login_server\package.json](/c:%5Creact_native%5Clogin_server%5Cpackage.json) | JSON | -26 | 0 | -1 | -27 |
| [c:\react_native\login_server\s3.js](/c:%5Creact_native%5Clogin_server%5Cs3.js) | JavaScript | -33 | -2 | -6 | -41 |
| [c:\react_native\login_server\server.js](/c:%5Creact_native%5Clogin_server%5Cserver.js) | JavaScript | -2,330 | -65 | -48 | -2,443 |
| [c:\react_native\login_server\socketHandler.js](/c:%5Creact_native%5Clogin_server%5CsocketHandler.js) | JavaScript | -158 | -3 | -13 | -174 |

[Summary](results.md) / [Details](details.md) / [Diff Summary](diff.md) / Diff Details