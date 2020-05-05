import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from "react-redux";
import styled from 'styled-components';

const FullScreenBoxSC = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`

const BoundingBoxSC = styled.div.attrs(props => ({
  style: {
    cursor: props.overrideCursor || "auto"
  }
}))`
  position: absolute;
  width: 100%;
  height: 100%;
`;

const ContainerSC = styled.div.attrs(props => ({
  style: {
    transform: `translateX(${props.offset.x}px)
                translateY(${props.offset.y}px)`,
    width: props.size ? props.size.w * props.zoom + "px" : "auto",
    height: props.size ? props.size.h * props.zoom + "px": "auto",
    cursor: props.overrideCursor || "move",
    border: "1px solid black"
  }
}))`
  flex-grow: 0;
  flex-shrink: 0;
  position: relative;
  box-sizing: content-box;
`;

const NResizeSC = styled.div`
  position: absolute;
  top: -7.5px;
  left: 7.5px;
  width: calc(100% - 15px);
  height: 15px;
  cursor: n-resize;
`;

const SResizeSC = styled.div`
  position: absolute;
  bottom: -7.5px;
  left: 7.5px;
  width: calc(100% - 15px);
  height: 15px;
  cursor: s-resize;
`;

const EResizeSC = styled.div`
  position: absolute;
  bottom: 7.5px;
  left: calc(100% - 7.5px);
  width: 15px;
  height: calc(100% - 15px);
  cursor: e-resize;
`;

const WResizeSC = styled.div`
  position: absolute;
  bottom: 7.5px;
  left: -7.5px;
  width: 15px;
  height: calc(100% - 15px);
  cursor: w-resize;
`;

const NEResizeSC = styled.div`
  position: absolute;
  top: -7.5px;
  left: calc(100% - 7.5px);
  width: 15px;
  height: 15px;
  cursor: ne-resize;
  border: 1px solid black;
`;

const SEResizeSC = styled.div`
  position: absolute;
  bottom: -7.5px;
  left: calc(100% - 7.5px);
  width: 15px;
  height: 15px;
  cursor: se-resize;
  border: 1px solid black;

`;

const SWResizeSC = styled.div`
  position: absolute;
  bottom: -7.5px;
  left: -7.5px;
  width: 15px;
  height: 15px;
  cursor: sw-resize;
  border: 1px solid black;

`;

const NWResizeSC = styled.div`
  position: absolute;
  top: -7.5px;
  left: -7.5px;
  width: 15px;
  height: 15px;
  cursor: nw-resize;
  border: 1px solid black;

`;

const CanvasSC = styled.canvas.attrs(props => ({
  style: {
    clipPath: `inset(${props.clip.up}px ${props.clip.right}px ${props.clip.down}px ${props.clip.left}px)`
  }
}))`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`

export default function TransformObject({initImage}) {
  const [currentAction, setCurrentAction] = useState("");
  const [dragOrigin, setDragOrigin] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ h: 0, w: 0 });
  const [transformImage, setTransformImage] = useState(null);
  const [transformCanvasSize, setTransformCanvasSize] = useState({ x: 0, y: 0 });

  const { workspaceOffset, zoom } = useSelector(state => {
    let settings = state.ui.workspaceSettings;
    return {
      workspaceOffset: {x: settings.translateX, y: settings.translateY},
      zoom: settings.zoomPct / 100
    }
  });

  const { documentWidth, documentHeight } = useSelector(state => state.main.present.documentSettings);

  const canvasRef = useRef();
  const boundingBoxRef = useRef();

  useEffect(() => {
    canvasRef.current.getContext('2d').imageSmoothingEnabled = false;
    const image = new Image();
    image.src = URL.createObjectURL(initImage);
    image.onload = () => {
      setTransformImage(image);
      let initWidth = image.width;
      let initHeight = image.height;
      setOffset({
        x: 0,
        y: 0
      });
      setSize({
        w: initWidth,
        h: initHeight
      });
      setTransformCanvasSize({
        w: initWidth,
        h: initHeight
      });
    }
  }, [initImage]);

  useEffect(() => {
    if (!transformImage) return;
    canvasRef.current.getContext('2d').drawImage(transformImage, 0, 0);
  }, [transformCanvasSize]);

  function handleMouseDown(ev, actionType) {
    if (ev.button !== 0) return;
    ev.stopPropagation();
    setCurrentAction(actionType);
    console.log({
      x: ev.screenX,
      y: ev.screenY,
      w: size.w,
      h: size.h,
      offX: offset.x,
      offY: offset.y,
    })
    setDragOrigin({
      x: ev.screenX,
      y: ev.screenY,
      w: size.w,
      h: size.h,
      offX: offset.x,
      offY: offset.y,
    });
  }

  function handleMouseMove(ev) {
    if (!currentAction) return;
    if (currentAction.endsWith("resize")) {
      handleResizeUpdate(ev);
    } else if (currentAction === "move") {
      handleMoveUpdate(ev);
    } else if (currentAction === "rotate") {
      handleRotateUpdate(ev);
    }
  }

  function handleResizeUpdate(ev) {
    let calculatedWidth = size.w;
    let calculatedHeight = size.h;
    let calculatedOffsetX = offset.x;
    let calculatedOffsetY = offset.y;

    if (currentAction.slice(0, 2).includes("n")) {
      calculatedHeight = dragOrigin.h - (ev.screenY - dragOrigin.y) / zoom;
      if (calculatedHeight > 1) {
        calculatedOffsetY = dragOrigin.offY + .5 * (ev.screenY - dragOrigin.y) / zoom;
      }
    }
    if (currentAction.slice(0, 2).includes("s")) {
      calculatedHeight = dragOrigin.h + (ev.screenY - dragOrigin.y) / zoom;
      if (calculatedHeight > 1) {
        calculatedOffsetY = dragOrigin.offY + .5 * (ev.screenY - dragOrigin.y) / zoom;
      }
    }
    if (currentAction.slice(0, 2).includes("e")) {
      calculatedWidth = dragOrigin.w + (ev.screenX - dragOrigin.x) / zoom;
      if (calculatedWidth > 1) {
        calculatedOffsetX = dragOrigin.offX + .5 * (ev.screenX - dragOrigin.x) / zoom;
      }
    }
    if (currentAction.slice(0, 2).includes("w")) {
      calculatedWidth = dragOrigin.w - (ev.screenX - dragOrigin.x) / zoom;
      if (calculatedWidth > 1) {
        calculatedOffsetX = dragOrigin.offX + .5 * (ev.screenX - dragOrigin.x) / zoom;
      }
    }

    setOffset({
      x: calculatedOffsetX,
      y: calculatedOffsetY
    });
    setSize({
      w: Math.max(calculatedWidth, 1),
      h: Math.max(calculatedHeight, 1)
    });
  }

  function handleMoveUpdate(ev) {
    const x = (ev.screenX - (dragOrigin.x - dragOrigin.offX * zoom)) / zoom;
    const y = (ev.screenY - (dragOrigin.y - dragOrigin.offY * zoom)) / zoom;
   
    setOffset({x, y});
  }

  function handleRotateUpdate(ev) {

  }

  function handleMouseUp() {
    if (dragOrigin) {
      let moved = offset.x - dragOrigin.offX
      console.log("x moved " + moved)
    }
    setCurrentAction("")
  }

  function calculateOffset() {
    if (!boundingBoxRef.current) {return {x: 0, y: 0}}
    const xFromCenter = (boundingBoxRef.current.clientWidth - size.w * zoom) / 2;
    const yFromCenter = (boundingBoxRef.current.clientHeight - size.h * zoom) / 2;
    return {
      x: xFromCenter + workspaceOffset.x + offset.x * zoom,
      y: yFromCenter + workspaceOffset.y + offset.y * zoom
    }
  }

  function calculateClipping() {
    return {
      up: ((.5 * size.h - offset.y) - .5 * documentHeight) * zoom,
      down: ((.5 * size.h + offset.y) - .5 * documentHeight) * zoom,
      left: ((.5 * size.w - offset.x) - .5 * documentWidth) * zoom,
      right: ((.5 * size.w + offset.x) - .5 * documentWidth) * zoom
    }
  }

  return (
    <BoundingBoxSC
        onMouseDown={ev => handleMouseDown(ev, "rotate")}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        overrideCursor={currentAction}
        ref={boundingBoxRef}
      >
        <FullScreenBoxSC />
        <ContainerSC
          offset={calculateOffset()}
          size={size}
          zoom={zoom}
          onMouseDown={ev => handleMouseDown(ev, "move")}
          overrideCursor={currentAction}
        >
          <CanvasSC width={transformCanvasSize.w} height={transformCanvasSize.h} clip={calculateClipping()} ref={canvasRef}/>
          <NResizeSC
            zoom={zoom}
            onMouseDown={ev => handleMouseDown(ev, "n-resize")}
          />
          <SResizeSC
            zoom={zoom}
            onMouseDown={ev => handleMouseDown(ev, "s-resize")}
          />
          <EResizeSC
            zoom={zoom}
            onMouseDown={ev => handleMouseDown(ev, "e-resize")}
          />
          <WResizeSC
            zoom={zoom}
            onMouseDown={ev => handleMouseDown(ev, "w-resize")}
          />
          <NEResizeSC
            zoom={zoom}
            onMouseDown={ev => handleMouseDown(ev, "ne-resize")}
          />
          <SEResizeSC
            zoom={zoom}
            onMouseDown={ev => handleMouseDown(ev, "se-resize")}
          />
          <SWResizeSC
            zoom={zoom}
            onMouseDown={ev => handleMouseDown(ev, "sw-resize")}
          />
          <NWResizeSC
            zoom={zoom}
            onMouseDown={ev => handleMouseDown(ev, "nw-resize")}
          />
        </ContainerSC>
      </BoundingBoxSC>
  )
}