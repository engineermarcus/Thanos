// npm install yt-search
import yts from 'yt-search';


export async function search(query){
    const result = await yts('nodejs tutorial');
    const video = result.videos[0];
    const title = video.title;
const url = video.url;
const views = video.views;
const duration = video.timestamp;
const thumbnail = video.thumbnail;
const channelName = video.author.name;
const channelUrl = video.author.url;
const videoId = video.videoId;
const description = video.description;
const ago = video.ago;


}

console.log(title, url, views, duration, thumbnail, channelName, channelUrl, videoId, description, ago);