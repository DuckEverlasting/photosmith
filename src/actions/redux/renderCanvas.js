import manipulate from "../../reducers/custom/manipulateReducer";

export default function renderCanvas(start, end, params={}) {
  return (dispatch, getState) => {
    requestAnimationFrame(() => {
      const activeProject = getState().main.activeProject;
      if (!activeProject) {return;}
      const {
        layerCanvas,
        layerSettings,
        renderOrder,
        selectionPath,
        selectionActive,
      } = getState().main.projects[activeProject].present,
        stagingPinnedTo = getState().main.stagingPinnedTo,
        mainCanvas = getState().main.mainCanvas,
        utilityCanvas = getState().main.utilityCanvas,
        zoom = getState().ui.workspaceSettings.zoomPct / 100,
        ctx = params.ctx ? params.ctx : mainCanvas.getContext("2d");
  
      if (!params.noClear) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      }
  
      if (start === undefined) start = 0;
      if (end === undefined) end = renderOrder.length;
  
      for (let i = start; i < end; i++) {
        const current = renderOrder[i]
        const { offset, blend, opacity } = layerSettings[current];
        
        if (layerSettings[current].hidden || opacity === 0) continue;
        manipulate(ctx, {
          action: "paste",
          params: {
            sourceCtx: layerCanvas[current].getContext("2d"),
            dest: offset,
            globalAlpha: opacity / 100,
            composite: blend
          }
        })
        if (stagingPinnedTo === current) {
          manipulate(ctx, {
            action: "paste",
            params: {
              sourceCtx: utilityCanvas.staging.getContext("2d"),
              dest: offset,
              globalAlpha: opacity / 100,
              composite: blend
            }
          })
        }
      }
      
      if (selectionActive) {  
        ctx.save();
        ctx.translate(.5, .5);
        ctx.strokeStyle = "rgba(0, 0, 0, 1)";
        ctx.setLineDash([7, 7]);
        ctx.lineWidth = Math.ceil(1 / zoom);
        ctx.stroke(selectionPath);
        ctx.strokeStyle = "rgba(255, 255, 255, 1)";
        ctx.lineDashOffset = 7;
        ctx.stroke(selectionPath);
        ctx.restore();
      }
        
      if (stagingPinnedTo === "selection") {
        manipulate(ctx, {
          action: "paste",
          params: {
            sourceCtx: utilityCanvas.staging.getContext("2d"),
            dest: {x: 0, y: 0}
          }
        })
      }
    })
  }
}