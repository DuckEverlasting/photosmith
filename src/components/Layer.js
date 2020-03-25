import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useSelector, useDispatch } from "react-redux";
import { updateLayerData } from '../actions/redux'

const LayerWrapperSC = styled.div.attrs(props => ({
  style: {
    width: `${props.width}px`,
    height: `${props.height}px`,
    title: props.title
  }
}))`
  position: absolute;
  overflow: hidden;
`

const LayerSC = styled.canvas.attrs(props => ({
  style: {
    visibility: props => props.hidden ? "hidden" : "visible",
    zIndex: props.index
  }
}))`
  position: absolute;
  width: 300%;
  height: 300%;
  bottom: -100%;
  right: -100%;
  image-rendering: pixelated;
`

function Layer(props) {
  const canvasRef = useRef(null);
  const onUndelete = useSelector(state => state.main.present.onUndelete);
  const layerData = useSelector(state => state.main.present.layerData[props.id]);
  const dispatch = useDispatch();

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    if (layerData) {
      ctx.drawImage(layerData, 0, 0);
    }
    dispatch(updateLayerData(props.id, canvasRef.current));
    if (onUndelete && onUndelete.id === props.id) {
      const viewWidth = Math.ceil(ctx.canvas.width / 3);
      const viewHeight = Math.ceil(ctx.canvas.height / 3);
      ctx.putImageData(onUndelete.data, viewWidth, viewHeight);
    }
  }, [onUndelete, props.id])

  return <LayerWrapperSC width={props.width} height={props.height}>
    <LayerSC title={`Layer ${props.id}`} width={Math.floor(props.width * 3)} height={Math.floor(props.height * 3)} hidden={props.hidden} index={props.index} ref={canvasRef} />
  </LayerWrapperSC>
}

export default React.memo(Layer)