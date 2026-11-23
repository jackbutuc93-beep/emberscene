import React from "react";
import { Composition, registerRoot } from "remotion";
import { Episode, calcEpisode, type EpisodeProps } from "./Episode";

// Episode entry: render any episode by id (public/episodes/<id>/...). 16:9, 30 fps.
const Root: React.FC = () => (
  <Composition id="episode" component={Episode} calculateMetadata={calcEpisode} defaultProps={{ id: "adrift-p1", subtitles: false } as EpisodeProps}
    durationInFrames={300} fps={30} width={1920} height={1080} />
);
registerRoot(Root);
