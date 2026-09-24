"use strict";

const axios = require("axios");
const yts = require("yt-search");
const { createDecipheriv } = require("crypto");
const fs = require("fs");
const os = require("os");
const NodeID3 = require("node-id3");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const YTMusic = require("ytmusic-api").default || require("ytmusic-api");

const ytm = new YTMusic();

const checkLinkType = (link) => {
    const reg = /^(?:spotify:|(?:https?:\/\/(?:open|play|embed)\.spotify\.com\/))(?:embed|\?uri=spotify:|embed\?uri=spotify:)?\/?(album|track|playlist)(?::|\/)((?:[0-9a-zA-Z]){22})/;
    const match = link.match(reg);
    if (match) {
        return {
            type: match[1],
            id: match[2]
        };
    } else {
        throw { name: "URL Error", message: `'${link}' is not a Spotify URL...` };
    }
};

const getProperURL = (id, type) => {
    return `https://open.spotify.com/${type}/${id}`;
};

const checkType = (ob) => {
    if (ob && typeof ob === 'object' && 'title' in ob && 'trackNumber' in ob) {
        return 'Track';
    } else if (ob && typeof ob === 'object' && 'name' in ob && 'tracks' in ob && 'albumCoverURL' in ob) {
        return 'Album';
    } else if (ob && typeof ob === 'object' && 'name' in ob && 'owner' in ob && 'playlistCoverURL' in ob) {
        return 'Playlist';
    } else if (Array.isArray(ob) && ob.length > 0 && 'status' in ob[0] && 'filename' in ob[0]) {
        return 'Results[]';
    } else {
        return 'None';
    }
};

const checkPath = (path) => {
    let c = path.replace(`~`, os.homedir());
    if (!fs.existsSync(c)) {
        throw Error('Filepath:( ' + c + " ) doesn't exist, please specify absolute path");
    } else if (c.slice(-1) != '/') {
        return `${c}/`;
    }
    return c;
};

const get_album_playlist = async (playlistId) => {
    let properUrl = `https://m.youtube.com/playlist?list=${playlistId}`;
    let resp = await axios.get(properUrl);
    let ytInitialData = JSON.parse(/(?:window\["ytInitialData"\])|(?:ytInitialData) =.*?({.*?});/s.exec(resp.data)?.[1] || '{}');
    let listData = ytInitialData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer;
    return listData.contents;
};

const getTrack = async (url = '') => {
    try {
        let linkData = checkLinkType(url);
        let properURL = getProperURL(linkData.id, linkData.type);
        let sp = await axios.get(properURL);
        let info = /<script id="initial-state" type="text\/plain">(.*?)<\/script>/s.exec(sp.data);
        let spData = JSON.parse(Buffer.from(decodeURIComponent(info[1]), 'base64').toString('utf8'));
        let spTrk = spData.entities.items[`spotify:${linkData.type}:${linkData.id}`];
        let tags = {
            title: spTrk.name,
            artist: spTrk.otherArtists.items.length == 0
                ? spTrk.firstArtist.items[0].profile.name
                : spTrk.firstArtist.items[0].profile.name + ', ' + spTrk.otherArtists.items.map((i) => i?.profile?.name).join(', '),
            year: `${spTrk.albumOfTrack.date.year}-${spTrk.albumOfTrack.date.month}-${spTrk.albumOfTrack.date.day}`,
            album: spTrk.albumOfTrack.name,
            id: 'ID',
            albumCoverURL: spTrk.albumOfTrack.coverArt.sources.slice(-1)[0].url,
            trackNumber: spTrk.trackNumber
        };
        await ytm.initialize();
        let yt_trk = await ytm.searchSongs(`${tags.title} - ${tags.artist}`);
        tags.id = yt_trk[0].videoId;
        return tags;
    } catch (err) {
        return `Caught: ${err.name} | ${err.message}`;
    }
};

const getAlbum = async (url = '') => {
    try {
        let linkData = checkLinkType(url);
        let properURL = getProperURL(linkData.id, linkData.type);
        let sp = await axios.get(properURL);
        let info = /<script id="initial-state" type="text\/plain">(.*?)<\/script>/s.exec(sp.data);
        let spData = JSON.parse(Buffer.from(decodeURIComponent(info[1]), 'base64').toString('utf8'));
        let spTrk = spData.entities.items[`spotify:${linkData.type}:${linkData.id}`];
        let tags = {
            name: spTrk.name,
            artist: spTrk.artists.items.map((e) => e.profile.name).join(', '),
            year: `${spTrk.date.year}-${spTrk.date.month}-${spTrk.date.day}`,
            tracks: [],
            albumCoverURL: spTrk.coverArt.sources.slice(-1)[0].url
        };
        await ytm.initialize();
        let alb = await ytm.searchAlbums(`${tags.artist} - ${tags.name}`);
        let yt_tracks = await get_album_playlist(alb[0].playlistId);
        spTrk.tracks.items.forEach((i, n) => {
            tags.tracks.push({
                title: i.track.name,
                id: yt_tracks[n].playlistVideoRenderer.videoId,
                trackNumber: i.track.trackNumber
            });
        });
        return tags;
    } catch (err) {
        return `Caught: ${err.name} | ${err.message}`;
    }
};

const getPlaylist = async (url = '') => {
    try {
        let linkData = checkLinkType(url);
        let properURL = getProperURL(linkData.id, linkData.type);
        let sp = await axios.get(properURL);
        let info = /<script id="initial-state" type="text\/plain">(.*?)<\/script>/s.exec(sp.data);
        let spData = JSON.parse(Buffer.from(decodeURIComponent(info[1]), 'base64').toString('utf8'));
        let spPlaylist = spData.entities.items[`spotify:${linkData.type}:${linkData.id}`];
        await ytm.initialize();
        let tags = {
            name: spPlaylist.name,
            owner: spPlaylist.ownerV2.data.name,
            description: spPlaylist?.description,
            followerCount: spPlaylist.followers,
            trackCount: spPlaylist.content.totalCount,
            tracks: spPlaylist.content.items.map(async (trk) => {
                let trackTitle = trk.itemV2.data.name;
                let trackArtists = trk.itemV2.data.artists.items.map((i) => i.profile.name).join(', ');
                let yt_trk = await ytm.searchSongs(`${trackTitle} - ${trackArtists}`);
                return {
                    title: trackTitle,
                    artist: trackArtists,
                    album: trk.itemV2.data.albumOfTrack.name,
                    id: yt_trk[0].videoId,
                    albumCoverURL: trk.itemV2.data.albumOfTrack.coverArt.sources.slice(-1)[0].url,
                    trackNumber: trk.itemV2.data.trackNumber
                };
            }),
            playlistCoverURL: spPlaylist.images.items[0].sources[0].url
        };
        await Promise.all(tags.tracks).then((items) => {
            tags.tracks = items;
        });
        return tags;
    } catch (err) {
        return `Caught: ${err.name} | ${err.message}`;
    }
};

const dl_track = async (id, filename) => {
    if (!fs.existsSync(filename)) {
        return await new Promise((resolve, reject) => {
            ffmpeg(ytdl(id, { quality: 'highestaudio', filter: 'audioonly' }))
                .audioBitrate(256)
                .save(filename)
                .on('error', (err) => {
                    console.error(`Failed to write file (${filename}): ${err}`);
                    fs.unlinkSync(filename);
                    resolve(false);
                })
                .on('end', () => {
                    resolve(true);
                });
        });
    } else {
        return await new Promise((resolve, reject) => {
            resolve(true);
        });
    }
};

const dl_album_normal = async (obj, oPath, tags, callback = () => { }) => {
    let Results = [];
    console.log("Normal downloading");
    for await (let res of obj.tracks) {
        let sanitizedTitle = res.title.replace(/[/\\]/g, ' ');
        let filename = `${oPath}${sanitizedTitle}.mp3`;
        let dlt = await dl_track(res.id, filename);
        if (dlt) {
            let tagStatus = NodeID3.update(tags, filename);
            if (tagStatus) {
                callback({ success: true, filename: filename, name: res.title });
                console.log(`Finished: ${filename}`);
                Results.push({ status: 'Success', filename: filename });
            } else {
                if (callback) callback({ success: false, reason: "tags", filename: filename, name: res.title });
                console.log(`Failed: ${filename} (tags)`);
                Results.push({ status: 'Failed (tags)', filename: filename, tags: tags });
            }
        } else {
            if (callback) callback({ success: false, reason: "stream", filename: filename, name: res.title });
            console.log(`Failed: ${filename} (stream)`);
            Results.push({ status: 'Failed (stream)', filename: filename, id: res.id, tags: tags });
        }
    }
    return Results;
};

const dl_album_fast = async (obj, oPath, tags, callback) => {
    let Results = [];
    let i = 0;
    return await new Promise(async (resolve, reject) => {
        console.log("Fast downloading");
        for await (let res of obj.tracks) {
            let sanitizedTitle = res.title.replace(/[/\\]/g, ' ');
            let filename = `${oPath}${sanitizedTitle}.mp3`;
            ffmpeg(ytdl(res.id, { quality: 'highestaudio', filter: 'audioonly' }))
                .audioBitrate(128)
                .save(filename)
                .on('error', (err) => {
                    tags.title = res.title;
                    tags.trackNumber = res.trackNumber;
                    if (callback) callback({ success: false, reason: "stream", filename: filename, name: res.title });
                    Results.push({ status: 'Failed (stream)', filename: filename, id: res.id, tags: tags });
                    console.error(`Failed to write file (${filename}): ${err}`);
                    fs.unlinkSync(filename);
                })
                .on('end', () => {
                    i++;
                    tags.title = res.title;
                    tags.trackNumber = res.trackNumber;
                    let tagStatus = NodeID3.update(tags, filename);
                    if (tagStatus) {
                        if (callback) callback({ success: true, filename: filename, name: res.title });
                        console.log(`Finished: ${filename}`);
                        Results.push({ status: 'Success', filename: filename });
                    } else {
                        if (callback) callback({ success: false, reason: "tags", filename: filename, name: res.title });
                        console.log(`Failed to add tags: ${filename}`);
                        Results.push({ status: 'Failed (tags)', filename: filename, id: res.id, tags: tags });
                    }
                    if (i == obj.tracks.length) {
                        resolve(Results);
                    }
                });
        }
    });
};

const downloadTrack = async (obj, outputPath = './') => {
    try {
        if (checkType(obj) != 'Track') {
            throw Error('obj passed is not of type <Track>');
        }
        let albCover = await axios.get(obj.albumCoverURL, { responseType: 'arraybuffer' });
        let tags = {
            title: obj.title,
            artist: obj.artist,
            album: obj.album,
            year: obj.year,
            trackNumber: obj.trackNumber,
            image: {
                imageBuffer: Buffer.from(albCover.data, 'utf-8')
            }
        };
        let sanitizedTitle = obj.title.replace(/[/\\]/g, ' ');
        let filename = `${checkPath(outputPath)}${sanitizedTitle}.mp3`;
        let dlt = await dl_track(obj.id, filename);
        if (dlt) {
            let tagStatus = NodeID3.update(tags, filename);
            if (tagStatus) {
                return [{ status: 'Success', filename: filename }];
            } else {
                return [{ status: 'Failed (tags)', filename: filename, tags: tags }];
            }
        } else {
            return [{ status: 'Failed (stream)', filename: filename, id: obj.id, tags: tags }];
        }
    } catch (err) {
        return `Caught: ${err}`;
    }
};

const downloadAlbum = async (obj, outputPath = './', sync = true, callback = () => { }) => {
    try {
        if (checkType(obj) != 'Album') {
            throw Error('obj passed is not of type <Album>');
        }
        let albCover = await axios.get(obj.albumCoverURL, { responseType: 'arraybuffer' });
        let tags = {
            artist: obj.artist,
            album: obj.name,
            year: obj.year,
            image: {
                imageBuffer: Buffer.from(albCover.data, 'utf-8')
            }
        };
        let oPath = checkPath(outputPath);
        if (sync) {
            return await dl_album_normal(obj, oPath, tags, callback);
        } else {
            return await dl_album_fast(obj, oPath, tags, callback);
        }
    } catch (err) {
        return `Caught: ${err}`;
    }
};

const downloadPlaylist = async (obj, outputPath = './', callback) => {
    try {
        let Results = [];
        if (checkType(obj) != 'Playlist') {
            throw Error('obj passed is not of type <Playlist>');
        }
        let oPath = checkPath(outputPath);
        for await (let res of obj.tracks) {
            let sanitizedTitle = res.title.replace(/[/\\]/g, ' ');
            let filename = `${oPath}${sanitizedTitle}.mp3`;
            let dlt = await dl_track(res.id, filename);
            let albCover = await axios.get(res.albumCoverURL, { responseType: 'arraybuffer' });
            let tags = {
                title: res.title,
                artist: res.artist,
                album: res.album,
                trackNumber: res.trackNumber,
                image: {
                    imageBuffer: Buffer.from(albCover.data, 'utf-8')
                }
            };
            if (dlt) {
                let tagStatus = NodeID3.update(tags, filename);
                if (tagStatus) {
                    if (callback) callback({ success: true, filename: filename, name: res.title });
                    console.log(`Finished: ${filename}`);
                    Results.push({ status: 'Success', filename: filename });
                } else {
                    if (callback) callback({ success: false, reason: "tags", filename: filename, name: res.title });
                    console.log(`Failed: ${filename} (tags)`);
                    Results.push({ status: 'Failed (tags)', filename: filename, tags: tags });
                }
            } else {
                if (callback) callback({ success: false, reason: "stream", filename: filename, name: res.title });
                console.log(`Failed: ${filename} (stream)`);
                Results.push({ status: 'Failed (stream)', filename: filename, id: res.id, tags: tags });
            }
        }
        return Results;
    } catch (err) {
        return `Caught: ${err}`;
    }
};

const retryDownload = async (Info) => {
    try {
        if (checkType(Info) != 'Results[]') {
            throw Error('obj passed is not of type <Results[]>');
        }
        let failedStream = Info.filter((i) => i.status == 'Failed (stream)' || i.status == 'Failed (tags)');
        if (failedStream.length == 0) {
            return true;
        }
        let Results = [];
        await Promise.all(failedStream.map(async (i) => {
            if (i.status == 'Failed (stream)') {
                let dlt = await dl_track(i.id, i.filename);
                if (dlt) {
                    let tagStatus = NodeID3.update(i.tags, i.filename);
                    if (tagStatus) {
                        Results.push({ status: 'Success', filename: i.filename });
                    } else {
                        Results.push({ status: 'Failed (tags)', filename: i.filename, tags: i.tags });
                    }
                } else {
                    Results.push({ status: 'Failed (stream)', filename: i.filename, id: i.id, tags: i.tags });
                }
            } else if (i.status == 'Failed (tags)') {
                let tagStatus = NodeID3.update(i.tags, i.filename);
                if (tagStatus) {
                    Results.push({ status: 'Success', filename: i.filename });
                } else {
                    Results.push({ status: 'Failed (tags)', filename: i.filename, tags: i.tags });
                }
            }
        }));
        return Results;
    } catch (err) {
        console.error(`Caught: ${err}`);
        return false;
    }
};

const get_id = (url) => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|v\/|embed\/|user\/[^\/\n\s]+\/)?(?:watch\?v=|v%3D|embed%2F|video%2F)?|youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/playlist\?list=)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const is_link = (input) => {
    const regex = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i;
    return regex.test(input);
};

const make_id = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
};

const format_date = (input) => {
    const date = new Date(input);
    const options = {
        timeZone: "Asia/Jakarta",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    };
    const formatter = new Intl.DateTimeFormat("id-ID", options);
    const formatted = formatter.format(date);
    return `${formatted.replace(".", ":")} WIB`;
};

const audio = [92, 128, 256, 320];
const video = [144, 360, 480, 720, 1080];

const decode = (enc) => {
    try {
        const secret_key = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
        const data = Buffer.from(enc, 'base64');
        const iv = data.slice(0, 16);
        const content = data.slice(16);
        const key = Buffer.from(secret_key, 'hex');
        const decipher = createDecipheriv('aes-128-cbc', key, iv);
        let decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
        return JSON.parse(decrypted.toString());
    } catch (error) {
        throw new Error(error.message);
    }
};

const savetube = async (link, quality, value) => {
    try {
        const cdn = (await axios.get("https://media.savetube.vip/api/random-cdn")).data.cdn;
        const infoget = (await axios.post('https://' + cdn + '/v2/info', {
            'url': link
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36',
                'Referer': 'https://save-tube.com/'
            }
        })).data;
        const info = decode(infoget.data);
        const response = (await axios.post('https://' + cdn + '/download', {
            'downloadType': value,
            'quality': `${quality}`,
            'key': info.key
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36',
                'Referer': 'https://save-tube.com/'
            }
        })).data;
        return {
            status: true,
            quality: `${quality}${value === "audio" ? "kbps" : "p"}`,
            availableQuality: value === "audio" ? audio : video,
            url: response.data.downloadUrl,
            filename: `${info.title} (${quality}${value === "audio" ? "kbps).mp3" : "p).mp4"}`
        };
    } catch (error) {
        console.error("Converting error:", error);
        return {
            status: false,
            message: "Converting error"
        };
    }
};

const ytmp3 = async (link, formats = 128) => {
    const id = get_id(link);
    const format = audio.includes(Number(formats)) ? Number(formats) : 128;
    if (!id) return {
        status: false,
        message: "Parameter link tidak valid!"
    };
    try {
        let url = "https://youtube.com/watch?v=" + id;
        let data = await yts(url);
        let response = await savetube(url, format, "audio");
        return {
            status: true,
            creator: "@etcxyz",
            metadata: data.all[0],
            download: response
        };
    } catch (error) {
        console.log(error);
        return {
            status: false,
            message: "Terjadi kesalahan pada sistem!"
        };
    }
};

const ytmp4 = async (link, formats = 360) => {
    const id = get_id(link);
    const format = video.includes(Number(formats)) ? Number(formats) : 360;
    if (!id) return {
        status: false,
        message: "Parameter link tidak valid!"
    };
    try {
        let url = "https://youtube.com/watch?v=" + id;
        let data = await yts(url);
        let response = await savetube(url, format, "video");
        return {
            status: true,
            creator: "@etcxyz",
            metadata: data.all[0],
            download: response
        };
    } catch (error) {
        console.log(error);
        return {
            status: false,
            message: "Terjadi kesalahan pada sistem!"
        };
    }
};

const metadata = async (link) => {
    const id = get_id(link);
    if (!id) return {
        status: false,
        message: "Parameter link tidak valid!"
    };
    try {
        const response = await axios.get('https://ytapi.apps.mattw.io/v3/videos', {
            params: {
                'key': 'foo1',
                'quotaUser': make_id(40),
                'part': 'snippet,statistics,recordingDetails,status,liveStreamingDetails,localizations,contentDetails,paidProductPlacementDetails,player,topicDetails',
                'id': id,
                '_': Date.now()
            },
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
                'Referer': 'https://mattw.io/youtube-metadata/'
            }
        });
        if (response.data.items.length === 0) return {
            status: false,
            message: "Gagal mendapatkan data, pastikan link benar!"
        };
        const snippet = response.data.items[0].snippet;
        const statistics = response.data.items[0].statistics;
        return {
            status: true,
            creator: "@etcxyz",
            id: id,
            channel_id: snippet.channelId,
            channel_title: snippet.channelTitle,
            title: snippet.title,
            description: snippet.description,
            thumbnails: Object.entries(snippet.thumbnails).map(([quality, data]) => ({
                quality,
                ...data
            })),
            tags: snippet.tags,
            published_date: snippet.publishedAt,
            published_format: format_date(snippet.publishedAt),
            statistics: {
                like: statistics.likeCount,
                view: statistics.viewCount,
                favorit: statistics.favoriteCount,
                comment: statistics.commentCount
            }
        };
    } catch (error) {
        console.log(error);
        return {
            status: false,
            message: "Terjadi kesalahan pada sistem!"
        };
    }
};

const channel = async (input) => {
    try {
        const url = is_link(input) ? input : "https://www.youtube.com/" + input.replace(/@/g, "");
        const response = await axios.get('https://ytapi.apps.mattw.io/v1/resolve_url', {
            params: {
                'url': url
            },
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
                'Referer': 'https://mattw.io/youtube-metadata/'
            }
        });
        if (response.data.message) return {
            status: false,
            message: response.data.message
        };
        const result = await axios.get('https://ytapi.apps.mattw.io/v3/channels', {
            params: {
                'key': 'foo1',
                'quotaUser': make_id(40),
                'part': 'id,snippet,statistics,brandingSettings,contentDetails,localizations,status,topicDetails',
                'id': response.data.channelId,
                '_': Date.now()
            },
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
                'Referer': 'https://mattw.io/youtube-metadata/'
            }
        });
        if (result.data.items.length === 0) return {
            status: false,
            message: "Tidak ada channel yang ditemukan"
        };
        const snippet = result.data.items[0].snippet;
        const statistics = result.data.items[0].statistics;
        return {
            status: true,
            creator: "@etcxyz",
            id: response.data.channelId,
            title: snippet.title,
            description: snippet.description,
            username: snippet.customUrl,
            thumbnails: Object.entries(snippet.thumbnails).map(([quality, data]) => ({
                quality,
                ...data
            })),
            banner: result.data.items[0].brandingSettings.image.bannerExternalUrl,
            published_date: snippet.publishedAt,
            published_format: format_date(snippet.publishedAt),
            statistics: {
                view: statistics.viewCount,
                video: statistics.videoCount,
                subscriber: statistics.subscriberCount
            }
        };
    } catch (error) {
        console.log(error);
        return {
            status: false,
            message: "Terjadi kesalahan pada sistem!"
        };
    }
};

const search = async (teks) => {
    try {
        let data = await yts(teks);
        return {
            status: true,
            creator: "@etcxyz",
            results: data.all
        };
    } catch (error) {
        return {
            status: false,
            message: error.message
        };
    }
};

const tiktokdl = async (url) => {
    let host = 'https://www.tikwm.com/';
    let res = await axios.post(host + 'api/', {}, {
        headers: {
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'sec-ch-ua': '"Chromium";v="104", " Not A;Brand";v="99", "Google Chrome";v="104"',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36'
        },
        params: {
            url: url,
            count: 12,
            cursor: 0,
            web: 1,
            hd: 1
        }
    });
    return {
        status: true,
        wm: host + res.data.data.wmplay,
        music: host + res.data.data.music,
        video: host + res.data.data.play
    };
};

const spotify = async (url, outputPath = './', sync = true, callback = () => {}) => {
    try {
        const link = checkLinkType(url);
        if (link.type === 'track') {
            const info = await getTrack(url);
            if (typeof info === 'string') return { status: false, message: info };
            const download = await downloadTrack(info, outputPath);
            return { status: true, type: 'track', info, download };
        } else if (link.type === 'album') {
            const info = await getAlbum(url);
            if (typeof info === 'string') return { status: false, message: info };
            const download = await downloadAlbum(info, outputPath, sync, callback);
            return { status: true, type: 'album', info, download };
        } else if (link.type === 'playlist') {
            const info = await getPlaylist(url);
            if (typeof info === 'string') return { status: false, message: info };
            const download = await downloadPlaylist(info, outputPath, callback);
            return { status: true, type: 'playlist', info, download };
        }
        return { status: false, message: 'Tipe Spotify tidak didukung' };
    } catch (err) {
        return { status: false, message: err.message || err };
    }
};

const casemd = async (command, query, options = {}) => {
    switch (command) {
        case 'yt':
        case 'ytmp4':
            return await ytmp4(query, options.quality || 360);
        case 'ytmp3':
        case 'yta':
            return await ytmp3(query, options.quality || 128);
        case 'tt':
        case 'tiktok':
            return await tiktokdl(query);
        case 'spotify':
        case 'sp':
            return await spotify(query, options.outputPath || './', options.sync !== undefined ? options.sync : true, options.callback || (() => {}));
        case 'search':
            return await search(query);
        case 'metadata':
        case 'meta':
            return await metadata(query);
        case 'channel':
            return await channel(query);
        default:
            return { status: false, message: 'Command tidak dikenal' };
    }
};

module.exports = { casemd };