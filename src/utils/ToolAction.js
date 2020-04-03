import {
  midpoint,
  getQuadLength,
  getGradient,
  convertDestToRegularShape
} from "../utils/helpers";

import {
  updateColor,
  updateSelectionPath,
  updateStagingPosition,
  putHistoryData
} from "../actions/redux/index";

import draw from "../reducers/custom/drawingReducer";
import manipulate from "../reducers/custom/manipulateReducer";
import selection from "../reducers/custom/selectionReducer";

class ToolActionBase {
  constructor(activeLayer, dispatch, translateData) {
    this.activeLayer = activeLayer;
    this.dispatch = dispatch;
    this.translateData = translateData;
  }

  _moveStaging(layer = this.activeLayer) {
    this.dispatch(updateStagingPosition(layer));
  }

  _clearStaging() {
    this.layerData.staging
      .getContext("2d")
      .clearRect(0, 0, this.layerData.staging.width, this.layerData.staging.height);
  }

  _selectionStart(ev) {
    if (ev.shiftKey) {
      this.addToSelection = true;
    } else {
      this.layerData.selection
        .getContext("2d")
        .clearRect(0, 0, this.layerData.selection.width, this.layerData.selection.height);
    }
  }

  _getCoordinates(ev) {
    return {
      x: (ev.nativeEvent.offsetX + this.translateData.x) * 100 / this.translateData.zoom,
      y: (ev.nativeEvent.offsetY + this.translateData.y) * 100 / this.translateData.zoom
    };
  }

  _setLockedAxis(ev) {
    /* 
      Determines which axis should be "locked" in certain functions.
    */
    if (!this.origin) {
      throw new Error("setLockedAxis requires an origin to be stored");
    }

    const {x, y} = this._getCoordinates(ev)
    if (this.lockedAxis && !ev.shiftKey) {
      this.lockedAxis = null;
    } else if (!this.lockedAxis && ev.shiftKey) {
      if (Math.abs(this.origin.x - x) < Math.abs(this.origin.y - y)) {
        this.lockedAxis = "x";
      } else {
        this.lockedAxis = "y";
      }
    }
  };

  start() {}

  move() {}

  end() {}
}

export class PencilAction extends ToolActionBase {
  constructor(activeLayer, dispatch, translateData, params) {
    super(activeLayer, dispatch, translateData);
    this.isSelectionTool = params.isSelectionTool;
    this.width = params.width;
    this.color = params.color;
    this.clip = params.clip;
  }

  start(ev, layerData) {
    this.layerData = layerData;
    this._clearStaging();
    this.origin = this._getCoordinates(ev);
    this.destArray = [this.origin];
    if (this.isSelectionTool) {
      this._selectionStart(ev);
      this._moveStaging("selection");
    } else {
      this._moveStaging();
    }
  }

  move(ev, layerData) {
    this.layerData = layerData;
    this._setLockedAxis(ev);
    let {x, y} = this._getCoordinates(ev);
    if (this.lockedAxis === "x") {
      x = this.origin.x;
    } else if (this.lockedAxis === "y") {
      y = this.origin.y;
    }

    this.destArray = [...this.destArray, {x, y}];

    draw(this.layerData.staging.getContext("2d"), {
      action: "drawQuad",
      params: {
        width: this.width,
        strokeColor: this.color,
        orig: this.origin,
        destArray: this.destArray,
        clip: this.clip,
        dashPattern: this.dashPattern,
        clearFirst: true
      }
    });

  }

  end(layerData) {
    this.layerData = layerData;
    if (this.isSelectionTool) {
      let path;
      if (this.destArray.length < 2) {
        path = null;
      } else {
        if (this.clip !== null && this.addToSelection) {
          path = new Path2D(this.clip);
        } else {
          path = new Path2D();
        }
        path = selection(path, {
          action: "drawQuadPath",
          params: { orig: this.origin, destArray: this.destArray }
        });
        const selectCtx = this.layerData.selection.getContext("2d");
        this.dispatch(putHistoryData(
          "selection",
          selectCtx,
          () => draw(selectCtx, {
            action: "drawQuadPath",
            params: {
              orig: this.origin,
              destArray: this.destArray,
              width: this.width,
              strokeColor: this.color,
              dashPattern: this.dashPattern,
            }
          })
        ));
      }
      this.dispatch(updateSelectionPath(path));
    } else {
      const activeCtx = this.layerData[this.activeLayer].getContext("2d")
      if (this.destArray.length > 1) {
        this.dispatch(putHistoryData(
          this.activeLayer,
          activeCtx,
          () => draw(activeCtx, {
            action: "drawQuad",
            params: {
              orig: this.origin,
              destArray: this.destArray,
              width: this.width,
              strokeColor: this.color,
              clip: this.clip
            }
          })
        ));
      }
    }
    this._clearStaging();
  }
}

export class BrushAction extends ToolActionBase {
  constructor(activeLayer, dispatch, translateData, params) {
    super(activeLayer, dispatch, translateData);
    this.composite = params.composite;
    this.width = params.width;
    this.clip = params.clip;
    this.gradient = getGradient(params.color, params.opacity, params.hardness);
  }

  start(ev, layerData) {
    this.layerData = layerData;
    const ctx = this.layerData[this.activeLayer].getContext("2d");
    const viewWidth = Math.ceil(ctx.canvas.width);
    const viewHeight = Math.ceil(ctx.canvas.height);
    this.prevImgData = ctx.getImageData(0, 0, viewWidth, viewHeight);
    this.origin = this._getCoordinates(ev);
    this.lastDest = this.origin;
  }

  move(ev, layerData) {
    this.layerData = layerData;
    this._setLockedAxis(ev);
    let x, y;
    if (this.lockedAxis === "x") {
      x = this.origin.x;
    } else if (this.lockedAxis === "y") {
      y = this.origin.y;
    } else {
      const coords = this._getCoordinates(ev);
      x = coords.x;
      y = coords.y;
    }

    const newMid = midpoint(this.lastDest, {x, y});

    if (
      getQuadLength(
        this.lastMid || this.origin,
        this.lastDest,
        newMid
      ) <
      this.width * 0.125
    ) {
      return;
    }

    draw(this.layerData[this.activeLayer].getContext("2d"), {
      action: "drawQuadPoints",
      params: {
        orig: this.origin,
        destArray: [this.lastMid || this.origin, this.lastDest, newMid],
        gradient: this.gradient,
        width: this.width,
        density: 0.125,
        composite: this.composite,
        clip: this.clip
      }
    });
    this.lastDest = {x, y};
    this.lastMid = newMid;
  }

  end(layerData) {
    this.layerData = layerData;
    this.dispatch(putHistoryData(
      this.activeLayer,
      this.layerData[this.activeLayer].getContext("2d"),
      null,
      this.prevImgData
    ));
    this.prevImgData = null;
  }
}

export class ShapeAction extends ToolActionBase {
  constructor(activeLayer, dispatch, translateData, params) {
    super(activeLayer, dispatch, translateData);
    this.isSelectionTool = params.isSelectionTool;
    this.drawActionType = params.drawActionType;
    this.regularOnShift = params.regularOnShift;
    this.color = params.color;
    this.width = params.width;
    this.dashPattern = params.dashPattern;
    this.clip = params.clip;
  }

  start(ev, layerData) {
    this.layerData = layerData;
    this._clearStaging();
    this.origin = this._getCoordinates(ev);
    if (this.isSelectionTool) {
      this._selectionStart(ev);
      this._moveStaging("selection");
    } else {
      this._moveStaging();
    }
  }

  move(ev, layerData) {
    this.layerData = layerData;
    this.dest = this._getCoordinates(ev);
    if (this.regularOnShift && ev.shiftKey) {
      this.dest = convertDestToRegularShape(this.origin, this.dest);
    };
    draw(this.layerData.staging.getContext("2d"), {
      action: this.drawActionType,
      params: {
        orig: this.origin,
        dest: this.dest,
        width: this.width,
        strokeColor: this.color,
        fillColor: this.color,
        dashPattern: this.dashPattern,
        clearFirst: true,
        clip: this.isSelectionTool ? null : this.clip
      }
    });
  }

  end(layerData) {
    this.layerData = layerData;
    if (this.isSelectionTool) {
      let path;
      if (!this.dest) {
        path = null;
      } else {
        if (this.clip !== null && this.addToSelection) {
          path = new Path2D(this.clip);
        } else {
          path = new Path2D();
        }
        path = selection(path, {
          action: this.drawActionType,
          params: { orig: this.origin, dest: this.dest }
        });
        const selectCtx = this.layerData.selection.getContext("2d");
        this.dispatch(putHistoryData(
          "selection",
          selectCtx,
          () => draw(selectCtx, {
            action: this.drawActionType,
            params: {
              orig: this.origin,
              dest: this.dest,
              width: this.width,
              strokeColor: this.color,
              dashPattern: this.dashPattern,
            }
          })
        ));
      }
      this.dispatch(updateSelectionPath(path));
    } else {
      const activeCtx = this.layerData[this.activeLayer].getContext("2d")
      if (this.dest) {
        this.dispatch(putHistoryData(
          this.activeLayer,
          activeCtx,
          () => draw(activeCtx, {
            action: this.drawActionType,
            params: {
              orig: this.origin,
              dest: this.dest,
              width: this.width,
              strokeColor: this.color,
              fillColor: this.color,
              clip: this.clip
            }
          })
        ));
      }
    }
    this._clearStaging();
  }
}

export class EyeDropperAction extends ToolActionBase {
  constructor(activeLayer, dispatch, translateData, params) {
    super(activeLayer, dispatch, translateData);
    this.layerOrder = params.layerOrder;
    this.modifier = window.navigator.platform.includes("Mac")
      ? "metaKey"
      : "ctrlKey";
  }

  start(ev, layerData) {
    this.layerData = layerData;
    let color;
    for (let i = this.layerOrder.length - 1; i >= 0; i--) {
      const ctx = this.layerData[this.layerOrder[i]].getContext("2d");
      const {x, y} = this._getCoordinates(ev);
      const pixel = ctx.getImageData(x, y, 1, 1);
      const data = pixel.data;
      if (data[3] === 0) {
        continue;
      } else {
        color = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
        break;
      }
    }
    if (color !== undefined) {
      const palette = ev[this.modifier] ? "secondary" : "primary"
      this.isDrawing = true;
      this.dispatch(updateColor(palette, color))
    };
  }

  move(ev, layerData) {
    this.layerData = layerData;
    if (this.isDrawing) {
      this.start(ev, layerData);
    }
  }
}

export class MoveAction extends ToolActionBase {
  constructor(activeLayer, dispatch, translateData) {
    super(activeLayer, dispatch, translateData);
  }

  start(ev, layerData) {
    this.layerData = layerData;
    const ctx = this.layerData[this.activeLayer].getContext("2d");
    const viewWidth = Math.ceil(ctx.canvas.width);
    const viewHeight = Math.ceil(ctx.canvas.height);
    this.prevImgData = ctx.getImageData(0, 0, viewWidth, viewHeight);
    this.origin = this._getCoordinates(ev);
    this.lastDest = this.origin;
  }

  move(ev, layerData) {
    this.layerData = layerData;
    if (this.throttle) {return};
    this._setLockedAxis(ev);
    let x, y;
    if (this.lockedAxis === "x") {
      x = this.origin.x;
    } else if (this.lockedAxis === "y") {
      y = this.origin.y;
    } else {
      const coords = this._getCoordinates(ev);
      x = coords.x;
      y = coords.y;
    }
    this.throttle = true;
    setTimeout(() => this.throttle = false, 25);
    manipulate(this.layerData[this.activeLayer].getContext("2d"), {
      action: "move",
      params: {
        orig: this.lastDest,
        dest: {x, y}
      }
    });
    this.lastDest = {x, y}
  }

  end(layerData) {
    this.layerData = layerData;
    this.dispatch(putHistoryData(
      this.activeLayer,
      this.layerData[this.activeLayer].getContext("2d"),
      null,
      this.prevImgData
    ));
    this.prevImgData = null;
  }
}

export class FillAction extends ToolActionBase {
  constructor(activeLayer, dispatch, translateData, params) {
    super(activeLayer, dispatch, translateData);
    this.colorArray = params.colorArray;
    this.tolerance = params.tolerance;
    this.clip = params.clip;
  }

  start(ev, layerData) {
    this.layerData = layerData;
    this.dispatch(putHistoryData(
      this.activeLayer,
      this.layerData[this.activeLayer].getContext("2d"),
      () => manipulate(this.layerData[this.activeLayer].getContext("2d"), {
        action: "fill",
        params: {
          orig: this._getCoordinates(ev),
          colorArray: this.colorArray,
          tolerance: this.tolerance,
          clip: this.clip
        }
      })
    ));
  }
}