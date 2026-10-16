/** App-wide settings shared by server and client code. */

/** Dates are compared in Swiss local time ("due today" means today in Zurich). */
export const APP_TIME_ZONE = "Europe/Zurich";

/** Follow-ups due within this many days (plus overdue ones) appear on the dashboard. */
export const FOLLOW_UP_HORIZON_DAYS = 2;
