# Chicago Crime Visualization

## Run locally

1. Install [Node.js](https://nodejs.org/).
2. In the project folder, install dependencies:

   ```sh
   npm install
   ```

3. Start the Vite development server:

   ```sh
   npm run dev
   ```

4. Open the local URL printed by Vite in your browser.

To create a production build, run `npm run build`. To serve that build locally,
run `npm run preview`.

## App token

Create a `.env` file in the project root and add your Chicago Data Portal app
token on a line named `token`:

```env
token=your_chicago_app_token
```

Vite reads this value when starting or building the app. The app cannot start
without a non-empty token. Keep `.env` private: it is gitignored, so do not
remove it from `.gitignore` or commit it.


