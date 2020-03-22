import {
  move,
  paste,
  undelete,
  fill,
  getDiff,
  swapData
} from '../../actions/custom/ctxActions.js'

export default function(ctx, { action, params }) {
  if (params.clearFirst) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  ctx.save()
  if (params.filter) {
    ctx.filter = params.filter;
  }
  if (params.globalOpacity) {
    ctx.globalOpacity = params.globalOpacity;
  }
  if (params.composite) {
    ctx.globalCompositeOperation = params.composite;
  }
  if (params.clip) {
    ctx.clip(params.clip);
  }
  switch (action) {
    case "move":
      move(ctx, params);
      break;
    case "paste":
      paste(ctx, params);
      break;
    case "undelete":
      undelete(ctx, params);
      break;
    case "fill":
      fill(ctx, params);
      break;
    case "clear":
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      break;
    case "getDiff":
      getDiff(ctx, params);
      break;
    case "swapData":
      swapData(ctx, params);
      break;
    case "null":
      break;
    default:
      console.log("error: invalid draw action");
      break;
  }
  ctx.restore()
}