import { useEffect, useState } from "react";

// Owns the schedule playback transport: playback state, speed/follow/pan
// controls, the step-advance timer, and the play/pause/stop/restart/step
// handlers. `testSchedule` is injected because building a playback route is
// coupled to map loading, which stays in App.
export function useSchedulePlayback({ testSchedule }) {
  const [schedulePlayback, setSchedulePlayback] = useState({
    route: [],
    index: 0,
    playing: false,
    status: "idle",
    error: "",
  });
  const [scheduleSpeed, setScheduleSpeed] = useState("1");
  const [customScheduleSpeed, setCustomScheduleSpeed] = useState("");
  const [followScheduleNpc, setFollowScheduleNpc] = useState(true);
  const [schedulePan, setSchedulePan] = useState({ x: 0, y: 0 });

  const scheduleSpeedValue = Math.max(0.05, Number(customScheduleSpeed || scheduleSpeed) || 1);
  const currentPlaybackStep = schedulePlayback.route[schedulePlayback.index] ?? null;

  useEffect(() => {
    if (!schedulePlayback.playing || !schedulePlayback.route.length) return undefined;
    const interval = window.setInterval(() => {
      setSchedulePlayback((current) => {
        if (!current.playing) return current;
        const nextIndex = Math.min(current.route.length - 1, current.index + 1);
        if (nextIndex === current.index) {
          return { ...current, playing: false, status: "complete" };
        }
        return { ...current, index: nextIndex, status: "valid" };
      });
    }, Math.max(50, 350 / scheduleSpeedValue));
    return () => window.clearInterval(interval);
  }, [schedulePlayback.playing, schedulePlayback.route.length, scheduleSpeedValue]);

  function playSchedule() {
    if (!schedulePlayback.route.length) {
      testSchedule();
      return;
    }
    setSchedulePlayback((current) => ({ ...current, playing: true, status: current.status === "complete" ? "valid" : current.status, error: "" }));
  }

  function pauseSchedule() {
    setSchedulePlayback((current) => ({ ...current, playing: false }));
  }

  function stopSchedule() {
    setSchedulePlayback((current) => ({ ...current, playing: false, index: 0, status: current.route.length ? "stopped" : "idle" }));
  }

  function restartSchedule() {
    if (!schedulePlayback.route.length) {
      testSchedule();
      return;
    }
    setSchedulePlayback((current) => ({ ...current, playing: true, index: 0, status: "valid", error: "" }));
  }

  function stepSchedule(delta) {
    setSchedulePlayback((current) => {
      if (!current.route.length) return current;
      return {
        ...current,
        playing: false,
        index: Math.max(0, Math.min(current.route.length - 1, current.index + delta)),
        status: current.status === "idle" ? "valid" : current.status,
      };
    });
  }

  return {
    schedulePlayback,
    setSchedulePlayback,
    scheduleSpeed,
    setScheduleSpeed,
    customScheduleSpeed,
    setCustomScheduleSpeed,
    followScheduleNpc,
    setFollowScheduleNpc,
    schedulePan,
    setSchedulePan,
    scheduleSpeedValue,
    currentPlaybackStep,
    playSchedule,
    pauseSchedule,
    stopSchedule,
    restartSchedule,
    stepSchedule,
  };
}
