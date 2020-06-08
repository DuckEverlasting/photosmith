import React, { useState, useRef, useCallback, useEffect } from "react";
import useEventListener from "../hooks/useEventListener";
import styled from "styled-components";
import { useSelector, useDispatch } from "react-redux";

import { toggleHelp, setHelpTopic } from "../actions/redux";

import { helpHierarchy, helpContent } from "../constants/helpDocumentation.json";

import DraggableWindow from "./DraggableWindow";
import Button from "./Button";

const HelpModalSC = styled.div`
  width: 100%;
  height: 100%;
  overscroll-behavior: contain;
`;

const MainContentSC = styled.div`
  width: 100%;
  height: calc(100% - 45px);
  display: flex;
`;

const ContentBoxSC = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  text-align: left;
  margin: 5px;
  padding: 20px;
  background: #303030;
  border-radius: 3px;
  overflow: auto;

  scrollbar-width: thin;
  scrollbar-color: #777777 #303030;

  &::-webkit-scrollbar {
    width: 11px;
  }
  &::-webkit-scrollbar-track {
    background: #303030;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #777777;
    border-radius: 6px;
    border: 1px solid #303030;
  }
`;

const TopicMenuSC = styled(ContentBoxSC)`
  margin-right: 2px;
  width: 35%;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
`;

const TopicBoxSC = styled.div`
  margin-left: -20px;

  & h2 {
    margin-bottom: 8px;
    font-size: 20px;
    text-align: center;
  }
`;

const CurrentTopicSC = styled(ContentBoxSC)`
  margin-left: 2px;
  width: 65%;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  color: white;

  & h2 {
    margin-bottom: 10px;
    font-size: 20px;
    text-align: center;
  }

  & p {
    line-height: 1.5rem;
    text-indent: 1rem;
  }

  & i {
    font-style: italic;
  }

  & b {
    font-weight: bold;
  }

  & ul {
    margin: 10px 10px 0 10px;
    padding-top: 5px;
    list-style-type: circle;
    border-top: 1px solid #777777;
  }

  & li {
    margin-top: 7px;
    margin-left: 10px;
    text-indent: 0;
  }

  & button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    font-family: "PT Sans";
    color: #ffe312;
    padding: 0;
  }
`;

const TopicSC = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  margin-left: 20px;
  color: ${(props) => (props.isCurrentTopic ? "#ffe312" : "white")};

  & p {
    display: flex;
    align-items: center;
    cursor: pointer;

    & span {
      padding: 8px 0;
      margin-right: 5px;
    }

    & button {
      width: 18px;
      height: 18px;
      border: none;
      background: none;
      outline: none;
      color: white;
      cursor: pointer;
      padding: 3px;
      display: inline-block;
      transform: rotate(${(props) => (props.isOpen ? "90deg" : "0")});
      transition: transform 0.2s;
    }
  }
`;

const CloseButtonSC = styled(Button)`
  margin: 0;
  margin-top: 5px;
  width: 200px;
  padding: 0 10px;
`;

function HelpModal() {
  const height = window.innerHeight;
  const width = window.innerWidth;
  const currentTopic = useSelector(state => state.ui.currentHelpTopic);
  const dispatch = useDispatch();

  function handleKeyDown(ev) {
    if (ev.key === "Escape") {
      handleClose();
    }
    ev.stopPropagation();
  }

  function handleClose() {
    dispatch(toggleHelp());
  }

  return (
    <DraggableWindow name="SnapShot Help" onKeyDown={handleKeyDown} initSize={{y: height * 0.6, x: width * 0.4}} minimumSize={{y: height * 0.4, x: width * 0.3}}>
      <HelpModalSC>
        <MainContentSC>
          <TopicMenu
            currentTopic={currentTopic}
            setCurrentTopic={topic => dispatch(setHelpTopic(topic))}
          />
          <TopicDisplay
            data={helpContent[currentTopic]}
            setCurrentTopic={topic => dispatch(setHelpTopic(topic))}
          />
        </MainContentSC>
        <CloseButtonSC onClick={handleClose}>CLOSE</CloseButtonSC>
      </HelpModalSC>
    </DraggableWindow>
  );
}

function TopicMenu({ height, width, currentTopic, setCurrentTopic }) {
  const [isScrollable, setIsScrollable] = useState(false);
  const topicMenuRef = useRef();

  const checkIfScrollable = useCallback(() => {
    const curr = topicMenuRef.current;
    if (curr.scrollHeight > curr.clientHeight && !isScrollable) {
      setIsScrollable(true);
    } else if (curr.scrollHeight <= curr.clientHeight && isScrollable) {
      setIsScrollable(false);
    }
  }, [isScrollable])

  useEffect(checkIfScrollable, [height, width])

  const wheelHandler = useCallback(ev => {
    checkIfScrollable();
    if (isScrollable) {ev.stopPropagation()}
  }, [isScrollable, checkIfScrollable])

  useEventListener("wheel", wheelHandler, topicMenuRef.current);

  return (
    <TopicMenuSC ref={topicMenuRef} height={height} width={width}>
      <TopicBoxSC>
        <h2>Help Topics</h2>
        {helpHierarchy &&
          helpHierarchy.map((el, i) => {
            return (
              <Topic
                data={el}
                key={el.slug + " " + i}
                currentTopic={currentTopic}
                setCurrentTopic={setCurrentTopic}
                triggerSizeCheck={checkIfScrollable}
              />
            );
          })}
      </TopicBoxSC>
    </TopicMenuSC>
  );
}

function TopicDisplay({ height, width, data, setCurrentTopic }) {
  const [isScrollable, setIsScrollable] = useState(false);

  function handleClick(ev) {
    if (ev.target.name) {
      setCurrentTopic(ev.target.name)
    }
  }

  const topicDisplayRef = useRef();

  const checkIfScrollable = useCallback(() => {
    const curr = topicDisplayRef.current;
    if (curr.scrollHeight > curr.clientHeight && !isScrollable) {
      setIsScrollable(true);
    } else if (curr.scrollHeight <= curr.clientHeight && isScrollable) {
      setIsScrollable(false);
    }
  }, [isScrollable])

  useEffect(checkIfScrollable, [height, width, data])

  const wheelHandler = useCallback(ev => {
    checkIfScrollable();
    if (isScrollable) {ev.stopPropagation()}
  }, [isScrollable, checkIfScrollable])

  useEventListener("wheel", wheelHandler, topicDisplayRef.current);

  return (
    <CurrentTopicSC id="topicDisplay" ref={topicDisplayRef} onClick={handleClick} height={height} width={width}>
      <h2>{data.title}</h2>
      <p dangerouslySetInnerHTML={{__html: data.text}} />
    </CurrentTopicSC>
  );
}

function Topic({ data, currentTopic, setCurrentTopic, triggerSizeCheck }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <TopicSC isOpen={isOpen} isCurrentTopic={data.slug === currentTopic}>
      <p>
        <span onClick={() => {
          setTimeout(triggerSizeCheck, isOpen ? 0 : 200);
          if (data.contents) {setIsOpen(true)}
          setCurrentTopic(data.slug);
        }}>
          {data.displayName}
        </span>
        {data.contents && <button onClick={() => {
          setTimeout(triggerSizeCheck, 200);
          setIsOpen(!isOpen)
        }}>></button>}
      </p>
      {data.contents &&
        isOpen &&
        data.contents.map((el, i) => (
          <Topic
            key={data.slug + " - " + el.slug + " " + i}
            data={el}
            currentTopic={currentTopic}
            setCurrentTopic={setCurrentTopic}
            triggerSizeCheck={triggerSizeCheck}
          />
        ))}
    </TopicSC>
  );
}

export default React.memo(HelpModal);