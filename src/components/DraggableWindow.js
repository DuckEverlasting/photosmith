import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";

const BoundingBoxSC = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
  outline: none;
`;

const TransparentOverlaySC = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  user-select: none;
  cursor: ${(props) => (props.dragging ? "grabbing" : "auto")};
  outline: none;
`;

const InnerModalSC = styled.div.attrs((props) => ({
  style: {
    transform: `translateX(${props.offset.x}px)
      translateY(${props.offset.y}px)`,
    boxShadow: props.dragging ? "0 1.5px 6px #111111" : "0 .5px 3px #222222",
    width: props.dimensions ? props.dimensions.w + "px" : "auto",
    height: props.dimensions ? props.dimensions.h + "px" : "auto",
  },
}))`
  position: absolute;
  border-radius: 3px;
  background: rgba(100, 100, 100, 0.9);
  color: white;
  user-select: none;
  cursor: auto;
`;

const TitleSC = styled.h3.attrs((props) => ({
  style: {
    background: props.caution ? props.theme.colors.highlight : "#303030",
    transition: props.caution ? "none" : "background 1s",
  },
}))`
  background: #303030;
  flex: 0 0;
  width: 100%;
  padding: 10px;
  border-top-left-radius: 3px;
  border-top-right-radius: 3px;
  cursor: ${(props) => (props.dragging ? "grabbing" : "grab")};
`;

const ContentSC = styled.div`
  display: flex;
  align-items: stretch;
  height: calc(100% - 36px);
  padding: 10px;
`;

const SWResizeSC = styled.div`
  position: absolute;
  bottom: -7.5px;
  left: -7.5px;
  width: 15px;
  height: 15px;
  cursor: sw-resize;
`;

const SEResizeSC = styled.div`
  position: absolute;
  bottom: -7.5px;
  left: calc(100% - 7.5px);
  width: 15px;
  height: 15px;
  cursor: se-resize;
`;

export default function DraggableWindow({
  name,
  children,
  initPosition=null,
  initSize=null,
  minimumSize=null,
  resizable = true,
  stopKeydown = true,
  onEscape=null,
  onEnter=null
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState("");
  const [dragOrigin, setDragOrigin] = useState({ x: null, y: null });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [modalDimensions, setModalDimensions] = useState(null);
  const [minSize, setMinSize] = useState(null);
  const [caution, setCaution] = useState(false);
  const [boundingDimensions, setBoundingDimensions] = useState({});

  const boundingBoxRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    let initWidth, initHeight;
    if (initSize) {
      initWidth = initSize.w;
      initHeight = initSize.h;
    } else {
      initWidth = Math.floor(modalRef.current.clientWidth);
      initHeight = Math.floor(modalRef.current.clientHeight);
    }
    setBoundingDimensions({
      w: Math.floor(boundingBoxRef.current.clientWidth),
      h: Math.floor(boundingBoxRef.current.clientHeight),
    });
    setModalDimensions({
      w: initWidth,
      h: initHeight,
    });
    setMinSize(
      minimumSize || {
        w: initWidth,
        h: initHeight,
      }
    );
    setOffset(
      initPosition || {
        x: Math.floor(boundingBoxRef.current.clientWidth) / 2 - initWidth / 2,
        y: Math.floor(boundingBoxRef.current.clientHeight) / 3 - initHeight / 3,
      }
    );
  }, [initPosition, initSize, minimumSize]);

  useEffect(() => {
    boundingBoxRef.current.focus();
  }, [])

  function handleMouseDown(e, resizeType = "") {
    if (e.button !== 0) return;
    setIsDragging(true);
    if (resizeType) {
      setIsResizing(resizeType);
    }
    setDragOrigin({
      x: Math.floor(e.screenX),
      y: Math.floor(e.screenY),
      w: modalDimensions.w,
      h: modalDimensions.h,
      offX: offset.x,
      offY: offset.y,
    });
    e.stopPropagation();
  }

  function handleMouseMove(e) {
    if (!isDragging) {
      return;
    }
    if (isDragging && e.buttons === 0) {
      if (isResizing) setIsResizing("");
      return setIsDragging(false);
    }
    const x = Math.floor(e.screenX) - (dragOrigin.x - dragOrigin.offX);
    const y = Math.floor(e.screenY) - (dragOrigin.y - dragOrigin.offY);

    if (!isResizing) {
      setOffset({
        x: Math.min(Math.max(x, 0), boundingDimensions.w - dragOrigin.w),
        y: Math.min(Math.max(y, 0), boundingDimensions.h - dragOrigin.h),
      });
    } else if (isResizing === "se") {
      setModalDimensions({
        w: Math.min(Math.max(
          minSize.w,
          dragOrigin.w + (Math.floor(e.screenX) - dragOrigin.x)
        ), boundingDimensions.w - dragOrigin.offX),
        h: Math.min(Math.max(
          minSize.h,
          dragOrigin.h + (Math.floor(e.screenY) - dragOrigin.y)
        ), boundingDimensions.h - dragOrigin.offY),
      });
    } else if (isResizing === "sw") {
      setOffset((prevOffset) => ({
        x: Math.min(
          Math.max(x, 0),
          dragOrigin.offX + (dragOrigin.w - minSize.w)
        ),
        y: prevOffset.y,
      }));
      setModalDimensions({
        w: Math.min(
          Math.max(minSize.w, dragOrigin.w - (e.screenX - dragOrigin.x)),
          dragOrigin.offX + dragOrigin.w
        ),
        h: Math.max(minSize.h, dragOrigin.h + (e.screenY - dragOrigin.y)),
      });
    }
  }

  function handleMouseUp() {
    if (!isDragging) return;
    setIsDragging(false);
    if (isResizing) setIsResizing("");
  }

  function handleClickOutside(e) {
    setCaution(true);
    setTimeout(() => setCaution(false), 100);
    e.stopPropagation();
  }

  function handleKeyDown(e) {
    if (onEscape && e.key === "Escape") {
      onEscape(e);
    }
    if (onEnter && e.key === "Enter") {
      onEnter(e);
    }
    if (stopKeydown) {
      e.stopPropagation();
    }
  }

  return (
    <BoundingBoxSC tabIndex={0} onKeyDown={handleKeyDown} ref={boundingBoxRef}>
      <TransparentOverlaySC
        onMouseDown={handleClickOutside}
        tabIndex={1}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        dragging={isDragging}
      />
      <InnerModalSC
        ref={modalRef}
        onMouseMove={handleMouseMove}
        onMouseDown={(e) => e.stopPropagation()}
        dragging={isDragging}
        offset={offset}
        dimensions={modalDimensions}
      >
        <TitleSC
          caution={caution}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          dragging={isDragging}
        >
          {name}
        </TitleSC>
        <ContentSC>{children}</ContentSC>
        {resizable && (
          <>
            <SWResizeSC
              onMouseDown={(e) => handleMouseDown(e, "sw")}
              onMouseMove={handleMouseMove}
            />
            <SEResizeSC
              onMouseDown={(e) => handleMouseDown(e, "se")}
              onMouseMove={handleMouseMove}
            />
          </>
        )}
      </InnerModalSC>
    </BoundingBoxSC>
  );
}
