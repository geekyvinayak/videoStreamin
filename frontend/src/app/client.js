'use client'
import React from "react";
import ReactPlayer from "react-player";
import VideoPlayer from './VideoPlayer'
import { useRef } from 'react'

const Client = () => {
  const playerRef = useRef(null)
  const videoLink = "http://3.108.26.248:8000/uploads/courses/1d05bc15-5439-4091-b38b-701ca7aafb30/index.m3u8"

  const videoPlayerOptions = {
    controls: true,
    responsive: true,
    fluid: true,
    sources: [
      {
        src: videoLink,
        type: "application/x-mpegURL"
      }
    ]
  }
  const handlePlayerReady = (player) => {
    playerRef.current = player;

    // You can handle player events here, for example:
    player.on("waiting", () => {
      videojs.log("player is waiting");
    });

    player.on("dispose", () => {
      videojs.log("player will dispose");
    });
  };
  return (
    <>
      <div>
        <h1>Video player</h1>
      </div>
      <VideoPlayer
      options={videoPlayerOptions}
      onReady={handlePlayerReady}
      />
    </>
  )
};

export default Client;
