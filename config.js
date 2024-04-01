// setting your list menu on here
const menu = {
  admin: ['hidetag', 'welcome', 'leaving', 'seticon', 'setname', 'tagall', 'promote', 'demote'],
  converter: ['sticker', 'toimg', 'togif', 'bubble', 'ttp', 'attp', 'emojimix'],
  downloader: ['tiktok', 'facebook', 'instagram', 'igstory', 'pindl', 'threads', 'twitter', 'play', 'ytmp3', 'ytmp4', 'pinterest', 'spotify'],
  fun: ['apakah', 'siapakah', 'kapankah', 'benarkah', 'bisakah'],
  group: ['afk', 'linkgc', 'delete', 'profile', 'quoted', 'readvo'],
  internet: ['openai', 'bard', 'bing', 'gemini', 'brainly', 'google', 'calc', 'remini', 'pinterest', 'nonton'],
}

const limit = {
  free: 15,
  premium: 150,
  VIP: 'Infinity',
  download: {
    free: 50000000, // use byte
    premium: 350000000, // use byte
    VIP: 1130000000, // use byte
  }
}

export default {
  limit,
  menu,

  // Set your URL and API key here
  APIs: {
    alya: 'https://aemt.me',
    dika: 'https://dikaardnt.com',
    dev: 'https://api.alyachan.dev',
    liph: 'https://api.caliph.biz.id',
    tiktod: 'https://tiktod.eu.org',
    mae: 'https://api.maelyn.my.id',
    ari: 'https://rest-api.akuari.my.id',
    lann: 'https://api.betabotz.eu.org',
    alyaa: 'https://api.alyachan.dev'
  },

  APIKeys: {
    'https://api.alyachan.dev': 'ZBHvwo',
    'https://api.caliph.biz.id': 'caliphkey',
    'https://api.maelyn.my.id': 'LSZHtbHFOD',
    'https://api.betabotz.eu.org': 'wvhpWMCI',
    'https://api.alyachan.dev': 'novelbot'
  },

  // Set Prefix, Session Name, Database Name and other options here
  options: {
    public: true,
    antiCall: true, // reject call
    database: 'database.json', // End .json when using JSON database or use Mongo URI
    owner: ['6289660042502'], // set owner number on here
    sessionName: 'session', // for name session
    prefix: /^[./!#+,]/i,
    pairingNumber: '6287740798567', // Example Input : 62xxx
    wm: 'Novel | Always With You',
  },

  // Set pack name sticker on here
  Exif: {
    packId: 'https://novel.lol',
    packName: `🦖`,
    packPublish: 'https://novel.lol',
    packEmail: 'arsyl@gmail.com',
    packWebsite: 'https://novel.lol',
    androidApp: 'https://play.google.com/store/apps/details?id=com.bitsmedia.android.muslimpro',
    iOSApp: 'https://apps.apple.com/id/app/muslim-pro-al-quran-adzan/id388389451?|=id',
    emojis: [],
    isAvatar: 0,
  },

  // message  response awikwok there
  msg: {
    owner: 'Features can only be accessed owner!',
    group: 'Features only accessible in group!',
    private: 'Features only accessible private chat!',
    admin: 'Features can only be accessed by group admin!',
    botAdmin: "Bot is not admin, can't use the features!",
    bot: 'Features only accessible by me',
    media: 'Reply media...',
    query: 'No Query?',
    error: 'Seems to have encountered an unexpected error, please repeat your command for a while again',
    quoted: 'Reply message...',
    wait: 'Wait a moment | novel.lol',
    urlInvalid: 'Url Invalid',
    notFound: 'Result Not Found!',
    premium: 'Premium Only Features!',
    vip: 'VIP Only Features!',
    dlFree: `File over ${formatSize(limit.download.free)} can only be accessed by premium users`,
    dlPremium: `WhatsApp cannot send files larger than ${formatSize(limit.download.premium)}`,
    dlVIP: `WhatsApp cannot send files larger than ${formatSize(limit.download.VIP)}`,
  },
}

function formatSize(bytes, si = true, dp = 2) {
  const thresh = si ? 1000 : 1024
  if (Math.abs(bytes) < thresh) {
    return `${bytes} B`
  }
  const units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
  let u = -1
  const r = 10 ** dp
  do {
    bytes /= thresh
    ++u
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1)
  return `${bytes.toFixed(dp)} ${units[u]}`
}

import { fileURLToPath } from 'url'
import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  import(`${file}?update=${Date.now()}`)
})