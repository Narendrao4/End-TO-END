# EndToEnd Mobile (Expo)

This is the mobile companion app for the existing web/backend project.

## 1) Install

From repo root:

npm run install:all

Or only mobile:

cd mobile
npm install

## 2) Configure API URL

Copy .env.example to .env and set your backend URL.

For Android emulator, use:

EXPO_PUBLIC_API_URL=http://10.0.2.2:4000

For iOS simulator, use:

EXPO_PUBLIC_API_URL=http://localhost:4000

For physical device, use your computer LAN IP:

EXPO_PUBLIC_API_URL=http://192.168.x.x:4000

## 3) Run mobile app

From repo root:

npm run dev:mobile

Or from mobile folder:

npm run start

Then press:

- a for Android emulator
- i for iOS simulator
- scan QR with Expo Go on phone

## Current features

- Login and register
- Session persistence with token refresh
- Friends list
- Open direct conversation
- Send and read encrypted messages
- Real-time socket updates for new messages, delivered/read status, and typing
- Friend requests screen (search users, send/accept/reject/cancel)
- Invite links screen (create, copy, share, deactivate)
- System theme support

## Notes

- Mobile uses the same backend routes and Socket.IO server.
- If backend CORS is strict, add your mobile origin/network as needed.
