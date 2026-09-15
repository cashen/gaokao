// v016 owns the visible human workbench. Keep the legacy observer permanently
// suppressed so asynchronous legacy history updates cannot replace the focused card.
window.__simulationHumanSyncDepth=Math.max(1,Number(window.__simulationHumanSyncDepth||0));
