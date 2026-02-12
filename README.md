**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the environment variables

```
VITE_BASE44_APP_ID=your_24_char_base44_app_id
VITE_BASE44_APP_BASE_URL=https://your-app-slug.base44.app
```

How to find `VITE_BASE44_APP_ID`:
- Open your app in Base44 Builder
- Copy the 24-character app ID from the Builder URL (`/apps/<APP_ID>/...`)

How to find `VITE_BASE44_APP_BASE_URL`:
- In Base44, open Publish/Share settings for your app
- Copy the published `https://...base44.app` URL

Run the app: `npm run dev`

## Quick Start: Popular Touring Cabinets Included

The app now includes a built-in popular touring catalog by default:
- Chauvet Professional F4X IP (`500x500`, `500x1000`)
- Absen PL3.9 Pro V2 (`500x500`, `500x1000`)
- ROE Visual Black Pearl V2, Ruby, Diamond (common `500x500` touring variants)

You can still click `Seed Popular Catalog` in `Cabinet Library`; it now confirms the built-in catalog and avoids Base44 write calls.

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)
