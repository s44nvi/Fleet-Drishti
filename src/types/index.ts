// Centralized domain + view types for the Fleet Drishti frontend.
// Components and services should only ever depend on these — never reach
// into src/data/mock directly — so the mock layer can be swapped for a real
// backend later without touching the UI.

export * from "./common";
export * from "./bus";
export * from "./route";
export * from "./camera";
export * from "./detection";
export * from "./event";
export * from "./evidence";
export * from "./issue";
export * from "./traffic";
export * from "./safety";
export * from "./infrastructure";
export * from "./ui";
export * from "./media";
