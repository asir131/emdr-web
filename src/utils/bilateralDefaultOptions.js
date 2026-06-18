const encodeSvg = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const PLAIN_BACKGROUND = {
  id: "plain-background",
  name: "Plain Background",
  image: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f7f5ef"/>
          <stop offset="100%" stop-color="#e6ede7"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#bg)"/>
    </svg>
  `),
  isBuiltIn: true,
};

export const BALL_OBJECT = {
  id: "plain-ball",
  name: "Ball",
  img: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <defs>
        <radialGradient id="ball" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="42%" stop-color="#7ea06d"/>
          <stop offset="100%" stop-color="#3f6048"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="74" fill="url(#ball)"/>
    </svg>
  `),
  mediaType: "image",
  isBuiltIn: true,
};

export const NO_NOISE_SOUND = {
  id: "no-noise",
  name: "No noise",
  image: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
      <rect width="160" height="160" rx="28" fill="#f7f5ef"/>
      <path d="M48 95H30a8 8 0 0 1-8-8V73a8 8 0 0 1 8-8h18l27-23c5-4 13-1 13 6v64c0 7-8 10-13 6L48 95Z" fill="#4A7C59"/>
      <path d="M104 60l34 40M138 60l-34 40" stroke="#0F1912" stroke-width="10" stroke-linecap="round"/>
    </svg>
  `),
  url: "",
  isSilent: true,
  isBuiltIn: true,
};

export const DEFAULT_BILATERAL_SELECTIONS = {
  environment: PLAIN_BACKGROUND.id,
  icon: BALL_OBJECT.id,
  sound: NO_NOISE_SOUND.id,
  speed: "medium",
  direction: "horizontal",
};

export const withDefaultBilateralOptions = ({ environments = [], icons = [], sounds = [] }) => ({
  environments: [PLAIN_BACKGROUND, ...environments],
  icons: [BALL_OBJECT, ...icons],
  sounds: [NO_NOISE_SOUND, ...sounds],
});
