
# Fly Decision

A Web / Android mobile / WPA application for automatic weather forecast analysis tailored for paragliding launch sites. Provides visual evaluations using a color-coded system to help paragliders make informed decisions about flying conditions. It has many more features and a launch site map with useful information and various filters (number of flights, average distance, etc.).


## Features

- **Weather forecast**: 

| Symbol / Metric | Description | Unit |
| :--- | :--- | :--- |
| **🌦️ Weather Icon** | General weather (cloud cover and precipitation) | - |
| **💦 Precipitation** | Amount of precipitation | mm (litres/m²) |
| **💦? Probability** | Probability that precipitation exceeds 0.1 mm | % |
| **180 m** | Mean wind at 180 m above ground | km/h |
| **120 m** | Mean wind at 120 m above ground | km/h |
| **80 m** | Mean wind at 80 m above ground | km/h |
| **10 m** | Mean wind at 10 m above ground | km/h |
| **💨 Max Gust** | Maximum gust at 10 m above ground | km/h |
| **🧭 Wind Dir.** | Wind direction at 10 m above ground | Degrees / Cardinal |
| **⚠️ Wind Shear** | Low-Level Wind Shear by speed / Forecast reliability | - |
| **☁️ AGL Ceiling** | Height of the boundary layer above ground (BLH) | km |
| **⚡ CAPE** | Convective Available Potential Energy | J/kg |
| **🛑 CIN** | Convective Inhibition | J/kg |

Note: The essential cloud base data ☁↓ (CBH = Cloud Base Height) is not available to complete the launch weather information (requested from the weather gateway in March 2026).

- **Data updates**: Updated automatically (Météo-France 8 times per day and European Centre for Medium-Range Weather Forecasts 4 times per day).
- **Wind Analysis**: Predictions for speed, direction, gusts, and turbulence (raffiness) across multiple altitudes
- **Customizable Thresholds**: Set minimum, ideal, and maximum wind speeds
- **Interactive Map**: Leaflet-based visualization of launch sites
- **External Integrations**: Links to Windy, Meteoblue, and Meteo-Parapente websites
- **Offline Support**: Local storage and caching for offline use
- **PWA**: Installable as a website that looks and behaves like a native mobile app, in computers, Android or iOS

## Technologies

### Frontend
- HTML5/CSS3 with Flexbox
- Vanilla JavaScript
- Leaflet.js for maps
- NoUISlider for range inputs
- Tippy.js for tooltips
- Driver.js for tutorials

### Mobile
- Capacitor v8.x for cross-platform deployment
- Progressive Web App (PWA)
- Capacitor plugins

### Android
- Gradle 8.13.0
- Android build tools

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm
- Capacitor CLI: `npm install -g @capacitor/cli`
- Android Studio (for Android builds)

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/flydecision.git
   cd flydecision/flydecision
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Sync Capacitor:
   ```bash
   npx cap sync android
   ```

4. Build the web assets:
   ```bash
   # If you have a build script, run it; otherwise, assets are in src/
   ```

5. Open in Android Studio:
   ```bash
   npx cap open android
   ```

## Usage

1. Launch the app on your device.
2. Select your favorites launch sites.
3. Set your wind speed and timetable preferences using the sliders.
4. View forecasts for nearby launch sites on the map.
5. Tap on info button of the sites to see more info and access to launch maps.
6. Check the original values from the weather model.
7. Evaluate the conditions using the visual color cues according to the defined thresholds: 🟩🟨🟥.

## Project Structure

### Core Files
- `src/index.html` - Main HTML entry point
- `src/meteo.js` - Core application logic (~1000 lines)
- `src/meteo.css` - Stylesheet
- `src/manifest.json` - PWA manifest
- `src/ayuda/index.html` - Help
- `src/changelog/index.html` - Changelog
- `src/icons/index.html` - Icons
- `src/map/index.html` - Map
- `src/privacidad/index.html` - Privacy and legal policy

### Configuration
- `capacitor.config.json` - Capacitor settings
- `package.json` - Node dependencies
- `android/` - Android-specific files

### Libraries
- `src/css/` - Styles for Leaflet, NoUISlider, Driver.js
- `src/js/` - JavaScript libraries

## Build Setup

- **Web Assets**: Served from `www/` directory
- **Android**: Built via Gradle wrapper (`gradlew`)

### Development Dependencies
- @capacitor/cli: ^8.0.2
- @capacitor/assets: ^3.0.5
- patch-package: ^8.0.1

### Data Sources
- The wind forecast models used are **AROME-HD 1.3 km** (for the first 0–48 h) and **ARPEGE 7 km** (for the following 48–96 h). Other meteorological variables come from **ECMWF IFS HRES 9 km**.
- 8 (Météo-France) and 4 (ECMWF) daily forecast updates
- The original data come from the public services provided by Météo-France and European Centre for Medium-Range Weather Forecasts, accessed through the gateway provided by Open‑Meteo (https://open-meteo.com/).

### Offline & Storage
- localStorage for settings
- Network status detection
- Data caching

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on Android device/emulator
5. Submit a pull request
6. Submit issues with your proposals for new features, detected bugs, suggested improvements, etc.

## License

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

This project is free software and is distributed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

In short, this means you are free to use, modify, and distribute this software. However, if you modify the code and make it accessible to others over a network (such as a web application, an API, or a SaaS), **you are required to publish the source code of your modifications** under this same license. This ensures that improvements continue to benefit the community.

For full details, please check the [LICENSE.md](LICENSE.md) file included in the root of this repository.

---
## Links & Resources

* [Help](https://flydecision.com/ayuda/)
* [Changelog](https://flydecision.com/changelog/)
* [Legal Notice and Privacy Policy](https://flydecision.com/privacidad/)

*Fly Decision* - Automatic analysis of the weather forecast for paragliding flights. Launch site map.
