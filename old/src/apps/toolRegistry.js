import { animationPortraitMakerApp } from "./animation-portrait-maker/appConfig";
import { cutsceneMakerApp } from "./cutscene-maker/appConfig";
import { scheduleMakerApp } from "./schedule-maker/appConfig";

export const toolApps = [
  cutsceneMakerApp,
  scheduleMakerApp,
  animationPortraitMakerApp,
];

export const toolAppsById = new Map(toolApps.map((app) => [app.id, app]));
export const toolAppsByRoute = new Map(toolApps.map((app) => [app.route, app]));
