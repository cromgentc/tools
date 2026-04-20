export const getMp3Url = (url) => {
  return url.replace("/upload/", "/upload/f_mp3/");
};

export const getWavUrl = (url) => {
  return url.replace("/upload/", "/upload/f_wav/");
};