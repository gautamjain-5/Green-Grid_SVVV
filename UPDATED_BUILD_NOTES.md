# Green-Grid_SVVV update notes

## Changes in this update
- Replaced the previous brand image with the supplied Eco-Tech Lotus Book Emblem and enlarged the logo.
- Renamed the visible product branding from Green-Grid_SVVV to Green-Grid_SVVV.
- Added a sticky landing-page header with a hamburger menu and direct Dashboard shortcut; the menu has a close (X) state and navigation links.
- Added an auto-advancing, looping three-image campus slideshow using the supplied campus image and existing campus artwork, with manual slide indicators.
- Improved glass-button interactions and slideshow transitions.
- Applied the selected theme whenever preferences are loaded/updated, to address theme toggles not applying consistently.
- Kept soft music user-initiated with a play/pause control; browsers generally block audio autoplay until a user gesture.

## Run on Windows
From this folder (the one containing package.json):

```powershell
npm.cmd install --legacy-peer-deps
npm.cmd run dev
```

Open the URL Vite prints (usually http://localhost:5173/).

## Limitations
- Sensor values remain simulated unless connected to real sensor hardware/services.
- Physical relay, AC, fan and water-valve control requires compatible hardware and secured backend integration.
- A production build was not run in this packaging environment because dependencies were not installed here.
