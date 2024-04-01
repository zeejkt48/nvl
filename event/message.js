import config from '../config.js'
import Func from '../lib/function.js'
import Scrap from '../lib/scraper.js'
import fs from 'fs'
import chalk from 'chalk'
import axios from 'axios'
import path from 'path'
import {
  getBinaryNodeChildren,
  generateWAMessage
} from '@whiskeysockets/baileys'
import {
  exec
} from 'child_process'
import {
  format
} from 'util'
import {
  fileURLToPath
} from 'url'
import {
  createRequire
} from 'module'
import fetch from 'node-fetch'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const __filename = Func.__filename(import.meta.url)
const require = createRequire(import.meta.url)

export default async function Message(conn, m, chatUpdate) {
  try {
    if (!m) return
    if (!config.options.public && !m.isOwner) return
    if (m.from && db.groups[m.from]?.mute && !m.isOwner) return
    if (m.isBaileys) return

    (await import('../lib/loadDatabase.js')).default(m)

    const prefix = m.prefix
    const isCmd = m.body.startsWith(prefix)
    const command = isCmd ? m.command.toLowerCase() : ''
    const quoted = m.isQuoted ? m.quoted : m
    const mime = (quoted.msg || quoted).mimetype || ''
    const isMedia = /image|video|sticker|audio/.test(mime)

    // AUTO Read
    if (db.setting.autoread) { conn.readMessages([m.key]) }

    // LOG Chat
    if (m.message && !m.isBaileys) {
      console.log(chalk.black(chalk.bgWhite('- FROM')), chalk.black(chalk.bgGreen(m.pushName)), chalk.black(chalk.yellow(m.sender)) + '\n' + chalk.black(chalk.bgWhite('- IN')), chalk.black(chalk.bgGreen(m.isGroup ? m.metadata.subject : 'Private Chat', m.from)) + '\n' + chalk.black(chalk.bgWhite('- MESSAGE')), chalk.black(chalk.bgGreen(m.body || m.type)))
    }

    // AFK
    let jids = [...new Set([...(m.mentions || []), ...(m.quoted ? [m.quoted.sender] : [])])]
    for (let jid of jids) {
      let user = db.users[jid]
      if (!user) continue
      let afkTime = user.afkTime
      if (!afkTime || afkTime < 0) continue
      let reason = user.afkReason || ''
      m.reply(`Jangan tag dia!\nDia sedang AFK ${reason ? 'dengan alasan ' + reason : 'tanpa alasan'} Selama ${Func.toTime(new Date - afkTime)}`)
    }

    if (db.users[m.sender].afkTime > -1) {
      let user = db.users[m.sender]
      m.reply(`Kamu berhenti AFK${user.afkReason ? ' setelah ' + user.afkReason : ''}\n\nSelama ${Func.toTime(new Date() - user.afkTime)}`)  
      user.afkTime = -1
      user.afkReason = ''
    }
    
    switch (command) {
      //────────────────────[ MISCS MENU ]────────────────────
      case 'menu':
      case 'help': {
        let text = `Hi @${m.sender.split`@`[0]}, This is a list of available commands\n\n> *Total Command :* ${Object.values(config.menu).map(a => a.length).reduce((total, num) => total + num, 0)}\n\n`

        Object.entries(config.menu).map(([type, command]) => {
          text += `╭──  –\n`
          text += `│ ◦ ${command.map(a => `${prefix + a}`).join('\n│ ◦ ')}\n`
          text += `╰──  –\n\n`
        }).join('\n\n')
        return conn.sendMessageModify(m.from, Func.Styles(text), m, {
          largeThumb: true,
          url: db.setting.link
        })
      }
      break
    

      case 'cekprem':
      case 'premium':
      case 'sewa':
      case 'owner':
      case 'creator': {
        conn.sendContact(m.from, config.options.owner, m)
      }
      break

      case 'ping': {
        const moment = (await import('moment-timezone')).default
        const calculatePing = function (timestamp, now) {
          return moment.duration(now - moment(timestamp * 1000)).asSeconds()
        }
        m.reply(`*Ping :* *_${calculatePing(m.timestamp, Date.now())} second(s)_*`)
      }
      break

      case 'balance':
      case 'limit': {
        m.reply('ga pake limit! donasi aja kalo mau botnya aktif terus')
      }
      break

      //────────────────────[ END MISCS MENU ]────────────────────
        
      //────────────────────[ VOICE CHANGER MENU ]────────────────────
      case 'bass': case 'blown': case 'deep': case 'earrape': case 'fast': case 'fat': case 'nightcore': case 'reverse': case 'robot': case 'slow': case 'smooth': case 'tupai': { 
        try {
          let set
          if (/bass/.test(command)) set = '-af equalizer=f=54:width_type=o:width=2:g=20'    
          if (/blown/.test(command)) set = '-af acrusher=.1:1:64:0:log'
          if (/deep/.test(command)) set = '-af atempo=4/4,asetrate=44500*2/3'
          if (/earrape/.test(command)) set = '-af volume=12'
          if (/fast/.test(command)) set = '-filter:a "atempo=1.63,asetrate=44100"'
          if (/fat/.test(command)) set = '-filter:a "atempo=1.6,asetrate=22100"'
          if (/nightcore/.test(command)) set = '-filter:a atempo=1.06,asetrate=44100*1.25'
          if (/reverse/.test(command)) set = '-filter_complex "areverse"'
          if (/robot/.test(command)) set = '-filter_complex "afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75"'
          if (/slow/.test(command)) set = '-filter:a "atempo=0.7,asetrate=44100"'
          if (/smooth/.test(command)) set = '-filter:v "minterpolate=\'mi_mode=mci:mc_mode=aobmc:vsbmc=1:fps=120\'"'
          if (/tupai/.test(command)) set = '-filter:a "atempo=0.5,asetrate=65100"'
          if (/audio/.test(mime)) {
            m.reply('wait')
            let media = await conn.downloadAndSaveMediaMessage(quoted)
            let ran = Func.getRandom('.mp3')
            exec(`ffmpeg -i ${media} ${set} ${ran}`, (err, stderr, stdout) => {
              fs.unlinkSync(media)
              if (err) return m.reply(err)
              let buff = fs.readFileSync(ran)
              m.reply(buff, { fileName: 'vn.mp3', mimetype: 'audio/mpeg' })  
              fs.unlinkSync(ran)
            })
          } else {
            m.reply(`Balas audio yang ingin diubah dengan caption *${prefix + command}*`)
          }
        } catch (e) {
          console.log(e)
        }
      }
      break
      //────────────────────[ END VOICE CHANGER MENU ]────────────────────
        
      //────────────────────[ FUN MENU ]────────────────────
      case 'apakah': {
        if (!m.text) return m.reply('Apa yang ingin kamu tanyakan?')
        let jawab = ['Ya', 'Mungkin iya', 'Mungkin', 'Mungkin tidak', 'Tidak', 'Tidak mungkin', 'Kurang tau', 'kayaknya iya', 'Mungkin sih', 'Sepertinya iya', 'Sepertinya tidak', 'mustahil', 'hooh', 'iyoooo', 'gak tau saya']
        let json = Func.random(jawab)
        m.reply(json)
      }
      break
        
      case 'kapankah': {
        if (!m.text) return m.reply('Apa yang ingin kamu tanyakan?')
        let jawab = ['detik', 'menit', 'jam', 'hari', 'minggu', 'bulan', 'tahun', 'dekade', 'abad']
        let json = Func.random(jawab)
         m.reply(`${Math.floor(Math.random() * 10)} ${json} lagi ...`)
      }
      break

      case 'siapakah': {
        if (!m.text) return m.reply('Apa yang ingin kamu tanyakan?')
        if (!m.isGroup) return m.reply('group')
        let who
        if (!m.isGroup) {
          let member = [m.sender, conn.user.jid]
          who = member[Math.floor(Math.random() * member.length)]
        } else {
          let member = participants.map((u) => u.id)
          who = member[Math.floor(Math.random() * member.length)]
        }
        m.reply(`@${who.split`@`[0]}`)
      }
      break

      case 'benarkah': {
        if (!m.text) return m.reply('Apanya yang benar?')
        let jawab = ['Iya', 'Sudah pasti', 'Sudah pasti benar', 'Tidak', 'Tentu tidak', 'Sudah pasti tidak']
        const json = Func.random(jawab)
        m.reply(json)
      }
      break
        
      case 'bisakah': {
        if (!m.text) return m.reply('Apanya yang bisa?')
        let jawab = ['Iya', 'Bisa', 'Tentu saja bisa', 'Tentu bisa', 'Sudah pasti', 'Sudah pasti bisa', 'Tidak', 'Tidak bisa', 'Tentu tidak', 'tentu tidak bisa', 'Sudah pasti tidak']
        const json = Func.random(jawab)
        m.reply(json)
      }
      break
      //────────────────────[ END FUN MENU ]────────────────────
        
      //────────────────────[ DOWNLOADER MENU ]────────────────────

      case 'tiktok':
        case 'tt': {
          if (!/https?:\/\/(www\.|v(t|m|vt)\.|t\.)?tiktok\.com/i.test(m.text)) return m.reply(`Example : ${prefix + command} https://vt.tiktok.com/ZSwWCk5o/`)
          await m.reply('wait')
          const json = await Func.fetchJson(API('alyaa', '/api/tiktok', {
            url: Func.isUrl(m.text)[0]
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          let result = json.data.find(v => v.type == 'nowatermark')
          if (!result) {
            json.data.map(x => {
              m.reply(x.url, {
                caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol`
              })
            })
          } else {
            m.reply(result.url, {
              caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol`
            })
          }
        }
        break
  
        case 'fb':
        case 'fbdl':
        case 'facebook': {
          if (!/https?:\/\/(fb\.watch|(www\.|web\.|m\.)?facebook\.com)/i.test(m.text)) return m.reply(`Example : ${prefix + command} https://www.facebook.com/watch/?v=2018727118289093`)
          await m.reply('wait')
          const json = await Func.fetchJson(API('alyaa', '/api/fb', {
            url: Func.isUrl(m.text)[0]
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          let result = json.data.find((v) => v.quality == 'HD' && v.response == 200)
          if (result) {
            m.reply(result.url, { caption: 'Donasi: https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol' })
          } else {
            let result = json.data.find((v) => v.quality == 'SD' && v.response == 200)
            if (!result) return m.reply('error')
            m.reply(result.url, { caption: 'Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol' })
          }
        }
        break
          
        case 'ig':
        case 'igdl':
        case 'instagram': {
          if (!/https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)/i.test(m.text)) return m.reply(`Example : ${prefix + command} https://www.instagram.com/p/CITVsRYnE9h/`)
          await m.reply('wait')
          let old = new Date()
          const json = await Func.fetchJson(API('alyaa', '/api/ig', {
            url: Func.isUrl(m.text)[0]
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          for (let v of json.data) {
            m.reply(v.url, { caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol` })
          }
        }
        break
          
        case 'twit':
        case 'twt':
        case 'twitter': {
          if (!/https?:\/\/(www\.)?(twitter|X)\.com\/.*\/status/i.test(m.text)) return m.reply(`Example : ${prefix + command} https://twitter.com/jokowi/status/1687008875864846336?s=20`)
          await m.reply('wait')
          let old = new Date()
          const json = await Func.fetchJson(API('alyaa', '/api/twitter', {
            url: Func.isUrl(m.text)[0]
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          for (let v of json.data) {
            m.reply(v.url, { caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol` })
          }
        }
        break
          
        case 'threads':
        case 'thread':
        case 'threadsdl': {
          if (!/https?:\/\/(www\.)?(threads)\.net/i.test(m.text)) return m.reply(`Example : ${prefix + command} https://www.threads.net/t/CuiXbGvPyJz/?igshid=NTc4MTIwNjQ2YQ==`)
          await m.reply('wait')
          let old = new Date()
          const json = await Func.fetchJson(API('alyaa', '/api/threads', {
            url: Func.isUrl(m.text)[0]
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          for (let v of json.data) {
            m.reply(v.url, { caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol` })
          }
        }
        break
          
        case 'igstory':
        case 'igs':
        case 'instagramstory': {
          if (!m.text) return m.reply(`Example : ${prefix + command} bulansutena`)
          await m.reply('wait')
          let old = new Date()
          const json = await Func.fetchJson(API('alyaa', '/api/igs2', {
            q: m.text
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          for (let v of json.data) {
            m.reply(v.url, { caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol` })
          }
        }
        break

        case 'spotify': {
          if (!/(?:https?:\/\/)?(?:spotify\.com\/|(?:www\.|m\.)?(?:open\.)?spotify\.com\/(?:track))/i.test(m.text)) return m.reply(`Example : ${prefix + command} https://spotify.com`)
          await m.reply('wait')
          const json = await Func.fetchJson(API('alyaa', '/api/spotifydl', {
            url: Func.isUrl(m.text)
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          let cap = `╭─「 *Spotify* 」\n`
          cap += `│ ◦ *Title* : ${json.data.title}\n`
          cap += `│ ◦ *Duration* : ${json.data.duration}\n`
          cap += `│ ◦ *Artists* : ${json.data.artist}\n`
          cap += `│ ◦ *Release* : ${json.data.publish}\n`
          cap += `╰────`
          conn.sendMessageModify(m.from, cap, m, {
            largeThumb: true,
            thumbnail: json.data.thumbnail
          }).then(() => {
            m.reply(json.data.url, { fileName: json.data.title, mimetype: 'audio/mpeg' })
          })
        }
        break

        case 'play':
          case 'music': {
            if (!m.text) return m.reply(`Example : ${prefix + command} hapus aku`)
            await m.reply('wait')
            let yt = await (await yts(m.text)).all
            const json = await Func.fetchJson(API('alyaa', '/api/yta', {
              url: yt[0].url
            }, 'apikey'))
            if (!json.status) return m.reply(Func.Format(json))
            let cap = `╭─「 *Yt Play* 」\n`
            cap += `│ ◦ *Title* : ${json.title}\n`
            cap += `│ ◦ *Size* : ${json.data.size}\n`
            cap += `│ ◦ *Duration* : ${json.duration}\n`
            cap += `│ ◦ *Quality* : ${json.data.quality}\n`
            cap += `╰────`
            conn.sendMessageModify(m.from, cap, m, {
              largeThumb: true,
              thumbnail: json.thumbnail
            }).then(() => {
              m.reply(json.data.url, { fileName: json.data.filename, mimetype: 'audio/mpeg' })
            })
          }
          break
            
          case 'yta':
          case 'ytmp3': {
            if (!/(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?(?:music\.)?youtube\.com\/(?:watch|v|embed|shorts))/i.test(m.text)) return m.reply(`Example : ${prefix + command} https://youtu.be/_EYbfKMTpRs`)
            await m.reply('wait')
            const json = await Func.fetchJson(API('alyaa', '/api/yta', {
              url: Func.isUrl(m.text)
            }, 'apikey'))
            if (!json.status) return m.reply(Func.Format(json))
            let cap = `╭─「 *Yt Mp3* 」\n`
            cap += `│ ◦ *Title* : ${json.title}\n`
            cap += `│ ◦ *Size* : ${json.data.size}\n`
            cap += `│ ◦ *Duration* : ${json.duration}\n`
            cap += `│ ◦ *Quality* : ${json.data.quality}\n`
            cap += `╰────`
            conn.sendMessageModify(m.from, cap, m, {
              largeThumb: true,
              thumbnail: json.thumbnail
            }).then(() => {
              m.reply(json.data.url, { fileName: json.data.filename, mimetype: 'audio/mpeg' })
            })
          }
          break
            
          case 'ytv':
          case 'ytmp4': {
            if (!/(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?(?:music\.)?youtube\.com\/(?:watch|v|embed|shorts))/i.test(m.text)) return m.reply(`Example : ${prefix + command} https://youtu.be/_EYbfKMTpRs`)
            await m.reply('wait')
            const json = await Func.fetchJson(API('alyaa', '/api/ytv', {
              url: Func.isUrl(m.text)
            }, 'apikey'))
            if (!json.status) return m.reply(Func.Format(json)) 
            let cap = `╭─「 *Yt Mp4* 」\n`
            cap += `│ ◦ *Title* : ${json.title}\n`
            cap += `│ ◦ *Size* : ${json.data.size}\n`
            cap += `│ ◦ *Duration* : ${json.duration}\n`
            cap += `│ ◦ *Quality* : ${json.data.quality}\n`
            cap += `╰────`
            m.reply(json.data.url, { caption: cap, fileName: json.data.filename, mimetype: 'video/mp4' })
          }
          break
 
          case 'pinterestdl':
            case 'pindl': {
              if (!m.text.match(/pin(?:terest)?(?:\.it|\.com)/)) return m.reply(`Example : ${prefix + command} https://pin.it/5fXaAWE`)
              await m.reply('wait')
              let old = new Date()
              const json = await Func.fetchJson(API('alyaa', '/api/pins', {
                url: Func.isUrl(m.text)
              }, 'apikey'))
              if (!json.status) return m.reply(Func.Format(json))
              json.data.map(v => {
                if (v.type == 'video') return m.reply(v.url, {
                  caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol`
                })
                if (v.type == 'image') return m.reply(v.url, {
                  caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol`
                })
              })
            }
            break

            case 'pinterest':
            case 'pin': {
              if (!m.text) return m.reply(`Example : ${prefix + command} moon`)
              m.reply('wait')
              let json = await Func.fetchJson(API('alyaa', '/api/pinterest', { q: m.text }, 'apikey'))
              if (!json.status) return m.reply(Func.Format(e))
              let old = new Date()
              for (let i = 0; i < 5; i++) {
                var rand = Math.floor(json.data.length * Math.random())
                m.reply(json.data[rand].url, {
                  caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol`
                })
              }
            }
            break
      
      //────────────────────[ END DOWNLOADER MENU ]────────────────────

        
      //────────────────────[ INTERNET MENU ]────────────────────

      case 'ai':
      case 'openai':
      case 'chatgpt': {
        if (!m.text) return m.reply(`Example : ${prefix + command} moon bot`)
        let json = await Func.fetchJson(API('alya', '/gpt4', { text: m.text }))
        if (!json.status) return m.reply(Func.Format(json))
        m.reply(json.result)
      }
      break

      case 'bing': {
        if (!m.text) return m.reply(`Example : ${prefix + command} moon bot`)
        const json = await Func.fetchJson(API('alya', '/bingai', { text: m.text }))
        if (!json.status) return m.reply(Func.Format(json))
        m.reply(json.result)
      }
      break

      case 'lirik': {
        if (!m.text) return m.reply(`Example : ${prefix + command} kenanglah aku`)
        m.reply('wait')
        const json = await Func.fetchJson(API('alya', '/lirik', { text: m.text }))
        if (!json.status) return m.reply(Func.Format(json))
        m.reply(json.result)
      }
      break

      case 'simi': {
        if (!m.text) return m.reply(`Example : ${prefix + command} moon bot`)
        const json = await Func.fetchJson(API('mae', '/api/simi', { q: m.text }, 'apikey'))
        if (!json.status) return m.reply(Func.Format(json))
        m.reply(json.result)
      }
      break

      case 'bard':
      case 'gemini':
      case 'brainly': {
        if (!m.text) return m.reply(`Example : ${prefix + command} moon bot`)
        const json = await Func.fetchJson(API('alya', '/gemini', { text: m.text }))
        if (!json.status) return m.reply(Func.Format(json))
        m.reply(json.result)
      }
      break

      case 'nonton': {
        if (!m.text) return m.reply(`Example : ${prefix + command} spiderman`)
        m.reply('wait')
        let json = await Func.fetchJson(API('alyaa', '/api/film', { q: m.text }, 'apikey'))
        if (!json.status) return m.reply(Func.Format(e))
        let cap = `\n`
        json.data.map((v, i) => {
          cap += `*` + (i + 1) + `.* ` + v.title + `\n`
          cap += `∘ Link : ` + v.url + `\n\n`
        })
        m.reply(cap)
      }
      break

      case 'google': {
        if (!m.text) return m.reply(`Example : ${prefix + command} moon`)
        m.reply('wait')
        let json = await Func.fetchJson(API('dika', '/api/search/google', { q: m.text }))
        if (!json.search) return m.reply(Func.Format(e))
        let cap = `Google Search\n\n`
        json.result.map((v, i) => {
          cap += `> *` + (i + 1) + `.* ` + v.title + `\n`
          cap += `∘ Link : ` + v.url + `\n\n`
        })
        m.reply(cap)
      }
      break

      //────────────────────[ END INTERNET MENU ]────────────────────

      //────────────────────[ TOOLS MENU ]────────────────────
      case 'calc': 
      case 'kalk': 
      case 'calculator': {
        let val = m.text
          .replace(/[^0-9\-\/+*×÷πEe()piPI/]/g, '')
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/π|pi/gi, 'Math.PI')
          .replace(/e/gi, 'Math.E')
          .replace(/\/+/g, '/')
          .replace(/\++/g, '+')
          .replace(/-+/g, '-')
        let format = val
          .replace(/Math\.PI/g, 'π')
          .replace(/Math\.E/g, 'e')
          .replace(/\//g, '÷')
          .replace(/\*×/g, '×')
        try {
          console.log(val)
          let result = (new Function('return ' + val))()
          if (!result) throw result
          m.reply(`*${format}* = _${result}_`)
        } catch (e) {
          if (e == undefined) return m.reply('Isinya?')
          m.reply('Format salah, hanya 0-9 dan Simbol -, +, *, /, ×, ÷, π, e, (, ) yang disupport')
        }
      }
      break

      case 'cekresi': {
        if (!m.text) return m.reply(`Example : ${prefix + command} jnt | JX1710180625`)
        m.reply('wait')
        let [ku, rir] = text.split` | `
        const json = await Func.fetchJson(API('alya', '/api/checkresi', { kurir: ku, resi: rir }, 'apikey'))
        if (!json.status) return m.reply(Func.Format(json))
        m.reply(Func.Format(e))
      }
      break
      //────────────────────[ END TOOLS MENU ]────────────────────

      //────────────────────[ OWNER MENU ]────────────────────
      case 'public': {
        if (!m.isOwner) return m.reply('owner')
        if (config.options.public) {
          config.options.public = false
          m.reply('Switch Bot To Self Mode')
        } else {
          config.options.public = true
          m.reply('Switch Bot To Public Mode')
        }
      }
      break

      case 'block': {
        if (!m.isOwner) return m.reply('owner')
        let users = m.mentions.length !== 0 ? m.mentions.slice(0, 2) : m.isQuoted ? [m.quoted.sender] : m.text.split(',').map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').slice(0, 2)
        if (users.length == 0) return m.reply('Fuck You 🖕')
        await conn.updateBlockStatus(users, 'block').then((res) => m.reply(Func.Format(res))).catch((err) => m.reply(Func.Format(err)))
      }
      break

      case 'unblock': {
        if (!m.isOwner) return m.reply('owner')
        let users = m.mentions.length !== 0 ? m.mentions.slice(0, 2) : m.isQuoted ? [m.quoted.sender] : m.text.split(',').map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').slice(0, 2)
        if (users.length == 0) return m.reply('Fuck You 🖕')
        await conn.updateBlockStatus(users, 'unblock').then((res) => m.reply(Func.Format(res))).catch((err) => m.reply(Func.Format(err)))
      }
      break

      case 'mute': {
        if (!m.isOwner) return m.reply('owner')
        let db = global.db.groups[m.from]
        if (db.mute) {
          db.mute = false
          m.reply('Succes Unmute This Group')
        } else if (!db.mute) {
          db.mute = true
          m.reply('Succes Mute This Group')
        }
      }
      break

      case 'seticon': {
        const media = await quoted.download()
        if (m.isOwner && !m.isGroup) {
          if (/full/i.test(m.text)) await conn.setProfilePicture(conn?.user?.id, media, "full")
          else if (/(de(l)?(ete)?|remove)/i.test(m.text)) await conn.removeProfilePicture(conn.decodeJid(conn?.user?.id))
          else await conn.setProfilePicture(conn?.user?.id, media, 'normal')
        } else if (m.isGroup && m.isAdmin && m.isBotAdmin) {
          if (/full/i.test(m.text)) await conn.setProfilePicture(m.from, media, 'full')
          else if (/(de(l)?(ete)?|remove)/i.test(m.text)) await conn.removeProfilePicture(m.from)
          else await conn.setProfilePicture(m.from, media, 'normal')
        }
      }
      break

      case 'setname': {
        if (m.isOwner && !m.isGroup) {
          await conn.updateProfileName(m.isQuoted ? quoted.body : quoted.text)
        } else if (m.isGroup && m.isAdmin && m.isBotAdmin) {
          await conn.groupUpdateSubject(m.from, m.isQuoted ? quoted.body : quoted.text)
        }
      }
      break

      case 'autoread': {
        if (!m.isOwner) return m.reply('owner')
        if (db.setting.autoread) {
          db.setting.autoread = false
          m.reply('Status : [ OFF ]')
        } else {
            db.setting.autoread = true
          m.reply('Status : [ ON ]')
        }
      }
      break

      case 'setcover': {
        if (!m.isOwner) return m.reply('owner')
        if (!/image\/(jpe?g|png)/.test(quoted.mime)) return m.reply(`Send or reply to images with commands ${prefix + command}`)
        m.reply('wait')
        let media = await quoted.download()
        let res = await Scrap.uploaderV2(media)
        if (!res.status) return m.reply(Func.Format(res))
        db.setting.cover = res.data.url
        m.reply('Cover successfully changed')
      }
      break

      case 'setlink': {
        if (!m.isOwner) return m.reply('owner')
        if (!/^https:\/\//i.test(m.text)) return m.reply(`Example : ${prefix + command} https://wa`)
        m.reply('wait')
        db.setting.link = Func.isUrl(m.text)
        m.reply('Link successfully changed')
      }
      break
      //────────────────────[ END OWNER MENU ]────────────────────

      //────────────────────[ CONVERTER MENU ]────────────────────
    
      case 'sticker':
      case 'setiker':
      case 'stickers':
      case 'sticker':
      case 'stiker': {
        if (/image|video|webp/i.test(quoted.mime)) {
          const buffer = await quoted.download()
          if (quoted?.msg?.seconds > 10) return m.reply(`Ukuran maximal 10 detik`)
          let exif
          if (m.text) {
            let [packname, author] = m.text.split('|')
            exif = {
              packName: packname ? packname : '',
              packPublish: author ? author : ''
            }
          } else {
            exif = {
              ...config.Exif
            }
          }
          m.reply(buffer, {
            asSticker: true,
            ...exif
          })
        } else if (m.mentions[0]) {
          m.reply('wait')
          let url = await conn.profilePictureUrl(m.mentions[0], 'image');
          m.reply(url, {
            asSticker: true,
            ...config.Exif
          })
        } else if (/(https?:\/\/.*\.(?:png|jpg|jpeg|webp|mov|mp4|webm|gif))/i.test(m.text)) {
          m.reply('wait')
          m.reply(Func.isUrl(m.text)[0], {
            asSticker: true,
            ...config.Exif
          })
        } else {
          m.reply(`Kirim/reply gambar/video (1-10 detik) dengan caption ${prefix + command}`)
        }
      }
      break

      case 'ttp': {
        if (!m.text) return m.reply(`Example : ${prefix + command} moon`)
        if (m.text.length > 10) return m.reply(`Max 10 letters`)
        m.reply('wait')
        let json = await Func.fetchJson(API('alyaa', '/api/ttp', {
          q: m.text
        }, 'apikey'))
        if (!json.status) return m.reply(Func.Format(json))
        m.reply(json.data.url, {
          asSticker: true,
          ...config.Exif
        })
      }
      break
        
      case 'attp': {
        if (!m.text) return m.reply(`Example : ${prefix + command} moon`)
        if (m.text.length > 10) return m.reply(`Max 10 letters`)
        m.reply('wait')
        let json = await Func.fetchJson(API('alyaa', '/api/attp', {
          q: m.text
        }, 'apikey'))
        if (!json.status) return m.reply(Func.Format(json))
        m.reply(json.data.url, {
          asSticker: true,
          ...config.Exif
        })
      }
      break

      case 'emojimix': {
        if (!m.text) return m.reply(`Example : *${prefix + command} 🥵 + 🥶*`)
        m.reply('wait')
        var [emoji1, emoji2] = m.text.split` + `
        let json = await Func.fetchJson(API('alyaa', '/api/emomix', {
          emo_a: emoji1,
          emo_b: emoji2
        }, 'apikey'))
        m.reply(json.data.url, {
          asSticker: true,
          ...config.Exif
        })
      }
      break

      case 'qc':
      case 'bubble': {
        let text = m.text
        if (!text) return m.reply(`Example : ${prefix + command} moon-bot`)
        if (text.length > 30) return m.reply(`Max 30 character.`)
        m.reply('wait')
        let pic
        try {
          pic = await conn.profilePictureUrl(m.quoted ? m.quoted.sender : m.sender, 'image')
        } catch {
          pic = 'https://telegra.ph/file/32ffb10285e5482b19d89.jpg'
        }
        const obj = {
          "type": "quote",
          "format": "png",
          "backgroundColor": "#FFFFFF",
          "width": 512,
          "height": 768,
          "scale": 2,
          "messages": [{
            "entities": [],
            "avatar": true,
            "from": {
              "id": 1,
              "name": m.quoted ? db.users[m.quoted.sender].name : m.pushName,
              "photo": {
                "url": pic
              }
            },
            "text": text,
            "replyMessage": {}
          }]
        }
        const json = await axios.post('https://bot.lyo.su/quote/generate', obj, {
          headers: {
             'Content-Type': 'application/json'
          }
        })
        const buffer = Buffer.from(json.data.result.image, 'base64')
        m.reply(buffer, {
          asSticker: true,
          ...config.Exif
        })
      }
      break

      case 'toimg':
      case 'togif':
      case 'tovideo':
      case 'toimage': {
        let {
          webp2mp4File
        } = (await import('../lib/sticker.js'))
        if (!/webp/i.test(quoted.mime)) return m.reply(`Reply Sticker with command ${prefix + command}`)
        if (quoted.isAnimated) {
          let media = await webp2mp4File((await quoted.download()))
          await m.reply(media)
        }
        let media = await quoted.download()
        await m.reply(media, {
          mimetype: 'image/png'
        })
      }
      break
      //────────────────────[ END CONVERTER MENU ]────────────────────

      //────────────────────[ GROUP MENU ]────────────────────
      case 'linkgroup':
      case 'linkgrup':
      case 'linkgc': {
        if (!m.isGroup) return m.reply('group')
        //if (!m.isAdmin) return m.reply('admin')
        if (!m.isBotAdmin) return m.reply('botAdmin')
        await m.reply('https://chat.whatsapp.com/' + (await conn.groupInviteCode(m.from)))
      }
      break

      case 'afk': {
        let user = db.users[m.sender]
        user.afkTime = + new Date
        user.afkReason = m.text
        m.reply(`@${m.sender.split`@`[0]} is now AFK\n\nReason : ${user.afkReason ? user.afkReason : '-'}`)
      }
      break

      case 'del':
      case 'delete': {
        if (!quoted) return
        conn.sendMessage(m.from, {
          delete: {
            remoteJid: m.from,
            fromMe: m.isBotAdmin ? false : true,
            id: quoted.id,
            participant: quoted.sender
          }
        })
      }
      break

      case 'profile': {
        let text = m.text
        let number = isNaN(text) ? (text.startsWith('+') ? text.replace(/[()+\s-]/g, '') : (text).split`@` [1]) : text
        if (!text && !quoted) return m.reply(`Mention or reply chat target.`)
        if (isNaN(number)) return m.reply(`Invalid number.`)
        if (number.length > 15) return m.reply(`Invalid format.`)
        try {
          if (text) {
            var user = number + '@s.whatsapp.net'
          } else if (m.quoted.sender) {
            var user = m.quoted.sender
          } else if (m.mentionedJid) {
            var user = number + '@s.whatsapp.net'
          }
        } catch (e) {} finally {
          var pic = false
          try {
            var pic = await conn.profilePictureUrl(user, 'image')
          } catch {} finally {
            if (!pic) return m.reply(`He/She didn't put a profile picture.`)
            m.reply(pic)
          }
        }
      }
      break

      case 'quoted':
      case 'q': {
        const { Serialize } = (await import('../lib/serialize.js'))
        if (!m.isQuoted) m.reply('quoted')
        try {
          const message = await Serialize(conn, (await conn.loadMessage(m.from, m.quoted.id)))
          if (!message.isQuoted) return m.reply('Quoted Not Found')
          conn.sendMessage(m.from, {
            forward: message.quoted
          })
        } catch {
          m.reply('Quoted Not Found')
        }
      }
      break


      case 'readvo': {
        if (!m.quoted) return m.reply(`Reply view once message to use this command.`)
        if (m.quoted.message) {
          let type = Object.keys(m.quoted.message)[0]
          let q = m.quoted.message[type]
          let media = await conn.downloadAndSaveMediaMessage(q)
          if (/video/.test(type)) {
            return await m.reply(media, { caption: q.caption || '' })
          } else if (/image/.test(type)) {
            return await m.reply(media, { caption: q.caption || '' })
          }
        } else m.reply(`Koplak`)
      }
      break
      //────────────────────[ END GROUP MENU ]────────────────────
        
      //────────────────────[ ADMIN MENU ]────────────────────      
      case 'hidetag':
      case 'ht':
      case 'h': {
        if (!m.isGroup) return m.reply('group')
        if (!m.isAdmin) return m.reply('admin')
        let mentions = m.metadata.participants.map(a => a.id)
        let mod = await conn.cMod(m.from, quoted, /hidetag|tag|ht|h|totag/i.test(quoted.body.toLowerCase()) ? quoted.body.toLowerCase().replace(prefix + command, "") : quoted.body)
        conn.sendMessage(m.from, {
          forward: mod,
          mentions
        })
      }
      break

      case 'tagall': {
        if (!m.isGroup) return m.reply('group')
        if (!m.isAdmin) return m.reply('admin')
        let teks = `Tagall\n\n"${m.text ? m.text : 'Hi admin mention you'}"\n\n`
        for (let a of m.metadata.participants) {
          teks += `◦ @${a.id.split('@')[0]}\n`
        }
        m.reply(teks)
      }
      break

      case 'promote': {
        if (!m.isGroup) return m.reply('group')
        if (!m.isAdmin) return m.reply('admin')
        if (!m.isBotAdmin) return m.reply('botAdmin')
        let users = m.mentions.length !== 0 ? m.mentions.slice(0, 2) : m.isQuoted ? [m.quoted.sender] : m.text.split(',').map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').slice(0, 2)
        if (users.length == 0) return m.reply('Fuck You 🖕')
        await conn.groupParticipantsUpdate(m.from, users, 'promote').then((res) => m.reply(Func.Format(res))).catch((err) => m.reply(Func.Format(err)))
      }
      break
        
      case 'demote': {
        if (!m.isGroup) return m.reply('group')
        if (!m.isAdmin) return m.reply('admin')
        if (!m.isBotAdmin) return m.reply('botAdmin')
        let users = m.mentions.length !== 0 ? m.mentions.slice(0, 2) : m.isQuoted ? [m.quoted.sender] : m.text.split(',').map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').slice(0, 2)
        if (users.length == 0) return m.reply('Fuck You 🖕')
        await conn.groupParticipantsUpdate(m.from, users, 'demote').then((res) => m.reply(Func.Format(res))).catch((err) => m.reply(Func.Format(err)))
      }
      break

      case 'welcome': {
        if (!m.isAdmin) return m.reply('admin')
        let db = global.db.groups[m.from]
        if (db.welcome) {
          db.welcome = false
          m.reply('Succes Deactive Welcome on This Group')
        } else if (!db.welcome) {
          db.welcome = true
          m.reply('Succes Activated Welcome on This Group')
        }
      }
      break

      case 'leaving': {
        if (!m.isAdmin) return m.reply('admin')
        let db = global.db.groups[m.from]
        if (db.leave) {
          db.leave = false
          m.reply('Succes Deactive Leaving on This Group')
        } else if (!db.leave) {
          db.leave = true
          m.reply('Succes Activated Leaving on This Group')
        }
      }
      break
      //────────────────────[ END ADMIN MENU ]────────────────────

      //────────────────────[ EFFECT MENU ]────────────────────

      case 'paretro': case 'retrolga': case 'plumy': case 'hdr': case 'sepia': case 'duotone': case 'blackwhite': case 'sketch': case 'sketchril': case 'oils': case 'esragan': case 'watercolor': case 'galaxy': case 'freplace': case 'rainbow': case 'solarize': case 'pinkbir': {
        if (!/image\/(jpe?g|png)/.test(quoted.mime)) return m.reply(`Reply or send photo use this command`)
        m.reply('wait')
        let old = new Date()
        let media = await quoted.download()
        let res = await Scrap.uploader(media)
        const json = await Func.fetchJson(API('alya', '/api/effect', {
          url: res.data.url,
          style: command.toLowerCase()
        }, 'apikey'))
        if (!json.status) return m.reply(Func.Format(json))
        m.reply(json.data.url, {
          caption: `*Proccess* : ${(new Date - old) * 1} ms`
        })
      }
      break
        
      //────────────────────[ END EFFECT MENU ]────────────────────
        
      //────────────────────[ TOOLS MENU ]────────────────────
      case 'fetch':
      case 'get': {
        if (!/^https:\/\//i.test(m.text)) return m.reply(`No Query?\n\nExample : ${prefix + command} https://api.alyachan.pro`)
        m.reply('wait')
        let mime = (await import('mime-types'))
        const res = await axios.get(Func.isUrl(m.text)[0], {
          responseType: 'arraybuffer'
        })
        if (!/utf-8|json|html|plain/.test(res?.headers?.get('content-type'))) {
          let fileName = /filename/i.test(res.headers?.get("content-disposition")) ? res.headers?.get("content-disposition")?.match(/filename=(.*)/)?.[1]?.replace(/["';]/g, '') : ''
          return m.reply(res.data, {
            fileName,
            mimetype: mime.lookup(fileName)
          })
        }
        let text = res?.data?.toString() || res?.data
        text = format(text)
        try {
          m.reply(text.slice(0, 65536) + '')
        } catch (e) {
          m.reply(format(e))
        }
      }
      break

      case 'rvo': {
        if (!quoted.msg.viewOnce) return m.reply(`Reply view once with command ${prefix + command}`)
        quoted.msg.viewOnce = false
        await conn.sendMessage(m.from, {
          forward: quoted
        }, {
          quoted: m
        })
      }
      break

      case 'text2img': {
        if (!m.text) return m.reply(`Example : ${prefix + command} red car`)
        m.reply('wait')
        let old = new Date()
        const json = await Func.fetchJson(API('alya', '/api/text2img', { text: m.text }, 'apikey'))
        if (!json.status) return m.reply(Func.Format(e))
        m.reply(json.data.images.url, { caption: `*Fecth* : ${(new Date - old) * 1} ms` })
      }
      break

      case 'totext':
      case 'ocr': {
        if (/image/i.test(quoted.mime)) {
          m.reply('wait')
          let old = new Date()
          const buffer = await quoted.download()
          const url = await Scrap.uploader(buffer)
          let json = await Func.fetchJson(API('alya', '/api/ocr', {
            image: url.data.url
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          m.reply(json.data.text)
        } else if (/(https?:\/\/.*\.(?:png|jpg|jpeg))/i.test(m.text)) {
          let json = await Func.fetchJson(API('alya', '/api/ocr', {
            image: Func.isUrl(m.text)[0]
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          m.reply(json.data.text)
        } else {
          m.reply(`Send or reply your photo...`)
        }
      }
      break
        
      case 'hd':
        case 'remini': {
          if (/image/i.test(quoted.mime)) {
            m.reply('wait')
            let old = new Date()
            const buffer = await quoted.download()
            const url = await Scrap.uploader(buffer)
            let json = await Func.fetchJson(API('alyaa', '/api/enhance', {
              image: url.data.url
            }, 'apikey'))
            if (!json.status) return m.reply(Func.Format(json))
            m.reply(json.data.url, {
              caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol`
            })
          } else if (/(https?:\/\/.*\.(?:png|jpg|jpeg))/i.test(m.text)) {
            let json = await Func.fetchJson(API('alyaa', '/api/enhance', {
              image: Func.isUrl(m.text)[0]
            }, 'apikey'))
            if (!json.status) return m.reply(Func.Format(json))
            m.reply(json.data.url, {
              caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol`
            })
          } else {
            m.reply(`Send or reply your photo...`)
          }
        }
        break
        
      case 'nobg':
      case 'removebg': {
        if (/image/i.test(quoted.mime)) {
          m.reply('wait')
          let old = new Date()
          const buffer = await quoted.download()
          const url = await Scrap.uploader(buffer)
          const json = await Func.fetchJson(API('alyaa', '/api/removebg4', {
            image: url.data.url
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          m.reply(json.data.url, {
            caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol`
          })
        } else if (/(https?:\/\/.*\.(?:png|jpg|jpeg))/i.test(m.text)) {
          const json = await Func.fetchJson(API('alyaa', '/api/removebg2', {
            image: Func.isUrl(m.text)[0]
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          m.reply(json.data.url, {
            caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol`
          })
        } else {
          m.reply(`Send or reply your photo...`)
        }
      }
      break
        
      case 'toanime':
      case 'jadianime': {
        if (/image/i.test(quoted.mime)) {
          m.reply('wait')
          let old = new Date()
          const buffer = await quoted.download()
          const url = await Scrap.uploader(buffer)
          const json = await Func.fetchJson(API('alyaa', '/api/toanime', {
            image: url.data.url,
            style: 'anime'
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          m.reply(json.data.url, {
            caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol`
          })
        } else if (/(https?:\/\/.*\.(?:png|jpg|jpeg))/i.test(m.text)) {
          const json = await Func.fetchJson(API('alyaa', '/api/toanime', {
            image: Func.isUrl(m.text)[0],
            style: 'anime'
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          m.reply(json.data.url, {
            caption: `>Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol`
          })
        } else {
          m.reply(`Send or reply your photo...`)
        }
      }
      break
        
      case 'tozombie':
      case 'jadizombie': {
        if (/image/i.test(quoted.mime)) {
          m.reply('wait')
          let old = new Date()
          const buffer = await quoted.download()
          const url = await Scrap.uploader(buffer)
          const json = await Func.fetchJson(API('alyaa', '/api/tozombie', {
            image: url.data.url
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          m.reply(json.data.url, {
            caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol`
          })
        } else if (/(https?:\/\/.*\.(?:png|jpg|jpeg))/i.test(m.text)) {
          const json = await Func.fetchJson(API('alyaa', '/api/tozombie', {
            image: Func.isUrl(m.text)[0]
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          m.reply(json.data.url, {
            caption: `Donasi:\n◦ https://trakteer.id/zeejkt48\n◦ https://saweria.co/novellol`
          })
        } else {
          m.reply(`Send or reply your photo...`)
        }
      }
      break
        
      case 'turnme': {
        if (/image/i.test(quoted.mime)) {
          m.reply('wait')
          let old = new Date()
          const buffer = await quoted.download()
          const url = await Scrap.uploader(buffer)
          let json = await Func.fetchJson(API('alya', '/api/ai-photo-editors', {
            image: url.data.url,
            style: 'anime'
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          m.reply(json.data.url, {
            caption: `*Proccess* : ${((new Date - old) * 1)} ms`
          })
        } else if (/(https?:\/\/.*\.(?:png|jpg|jpeg))/i.test(m.text)) {
          let json = await Func.fetchJson(API('alya', '/api/ai-photo-editors', {
            image: Func.isUrl(m.text)[0],
            style: 'anime'
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          m.reply(json.data.url, {
            caption: `*Proccess* : ${((new Date - old) * 1)} ms`
          })
        } else {
          m.reply(`Send or reply your photo...`)
        }
      }
      break
        
      case 'gta5style': {
        if (/image/i.test(quoted.mime)) {
          m.reply('wait')
          let old = new Date()
          const buffer = await quoted.download()
          const url = await Scrap.uploader(buffer)
          let json = await Func.fetchJson(API('alya', '/api/ai-photo-editors', {
            image: url.data.url,
            style: 'gta_5'
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          m.reply(json.data.url, {
            caption: `*Proccess* : ${((new Date - old) * 1)} ms`
          })
        } else if (/(https?:\/\/.*\.(?:png|jpg|jpeg))/i.test(m.text)) {
          let json = await Func.fetchJson(API('alya', '/api/ai-photo-editors', {
            image: Func.isUrl(m.text)[0],
            style: 'gta_5'
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          m.reply(json.data.url, {
            caption: `*Proccess* : ${((new Date - old) * 1)} ms`
          })
        } else {
          m.reply(`Send or reply your photo...`)
        }
      }
      break
        
      case 'recolor': {
        if (/image/i.test(quoted.mime)) {
          m.reply('wait')
          let old = new Date()
          const buffer = await quoted.download()
          const url = await Scrap.uploader(buffer)
          let json = await Func.fetchJson(API('alya', '/api/colorizer', {
            image: url.data.url
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          m.reply(json.data.url, {
            caption: `*Proccess* : ${((new Date - old) * 1)} ms`
          })
        } else if (/(https?:\/\/.*\.(?:png|jpg|jpeg))/i.test(m.text)) {
          let json = await Func.fetchJson(API('alya', '/api/colorizer', {
            image: Func.isUrl(m.text)[0]
          }, 'apikey'))
          if (!json.status) return m.reply(Func.Format(json))
          m.reply(json.data.url, {
            caption: `*Proccess* : ${((new Date - old) * 1)} ms`
          })
        } else {
          m.reply(`Send or reply your photo...`)
        }
      }
      break

      case 'ss':
      case 'ssmobile':
      case 'screenshot': {
        if (!/^https:\/\//i.test(m.text)) return m.reply(`No Query?\n\nExample : ${prefix + command} https://api.alyachan.pro`)
        m.reply('wait')
        let old = new Date()
        const json = await Func.fetchJson(API('alya', '/api/sshp', { url: Func.isUrl(m.text)[0] }, 'apikey'))
        if (!json.status) return m.reply(Func.Format(json))
        m.reply(json.data.url, { caption: `*Proccess* : ${((new Date - old) * 1)} ms` })
      }
      break

      case 'ssweb': {
        if (!/^https:\/\//i.test(m.text)) return m.reply(`No Query?\n\nExample : ${prefix + command} https://api.alyachan.pro`)
        m.reply('wait')
        let old = new Date()
        const json = await Func.fetchJson(API('alya', '/api/ssweb', { url: Func.isUrl(m.text)[0] }, 'apikey'))
        if (!json.status) return m.reply(Func.Format(json))
        m.reply(json.data.url, { caption: `*Proccess* : ${((new Date - old) * 1)} ms` })
      }
      break

      case 'transcibe': {
        if (!/(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?(?:music\.)?youtube\.com\/(?:watch|v|embed|shorts))/i.test(m.text)) return m.reply(`Example : ${prefix + command} https://youtu.be/_EYbfKMTpRs`)
        m.reply('wait')
        const json = await Func.fetchJson(API('alya', '/api/transcribe', { url: m.text }, 'apikey'))
        if (!json.status) return m.reply(Func.Format(json))
        let res = json.data.map(v => v.f).join(' ')
        m.reply(res)
      }
      break

      case 'shortlink':
      case 'expand': {
        if (!/^https:\/\//i.test(m.text)) return m.reply(`No Query?\n\nExample : ${prefix + command} https://api.alyachan.pro`)
        m.reply('wait')
        const json = await Func.fetchJson(API('alya', '/api/shorten', { url: Func.isUrl(m.text)[0] }, 'apikey'))
        if (!json.status) return m.reply(Func.Format(json))
        await m.reply(Func.Format(json.data.url))
      }
      break
      

      case 'tr':
      case 'translate': {
        let text = m.text
        if (!text) return m.reply(`No Query?\n\nExample : ${prefix + command} id What your name`)
        m.reply('wait')
        if (text && m.quoted && m.quoted.text) {
          let lang = text.slice(0, 2)
          try {
            let data = m.quoted.text
            let json = await Func.fetchJson(API('alya', '/api/translate', { text: data, iso: lang }, 'apikey'))
            m.reply(json.data.text)
          } catch (e) {
            console.log(e)
            m.reply(`Language code is not supported`)
          }
        } else if (text) {
          let lang = text.slice(0, 2)
          try {
            let data = text.substring(2).trim()
            let json = await Func.fetchJson(API('alya', '/api/translate', { text: data, iso: lang }, 'apikey'))
            m.reply(json.data.text)
          } catch (e) {
            console.log(e)
            m.reply(`Language code is not supported`)
          }
        }
      }
      break

      case 'tts': {
        let lang
        if (!m.args[0]) return m.reply(`No Query?\n\nExample : ${prefix + command} id What your name`)
        m.reply('wait')
        try {
          let text = m.args.slice(1).join('')
          if ((m.args[0] || '').length !== 2) {
            lang = 'id'
            text = m.args.join(' ')
          }
          if (!text && m.quoted && m.quoted.text) text = m.quoted.text
          conn.sendPresenceUpdate('recording', m.chat)
          let json = await Func.fetchJson(API('alya', '/api/tts', { text: text, iso: m.args[0] }, 'apikey'))
          conn.sendMedia(m.from, json.data.url, m, {
            ptt: true
          })
        } catch (e) {
          console.log(e)
          return m.reply(`enter language code`)
        }
      }
      break

      case 'magernulis':
      case 'nulis': {
        if (!m.text) return m.reply(`Example : ${prefix + command} moon-bot wehwehweh`)
        m.reply('wait')
        let old = new Date()
        const json = await Func.fetchJson(API('alya', '/api/magernulis', { text: m.text }, 'apikey'))
        if (!json.status) return m.reply(Func.Format(json))
        m.reply(json.data.url, {
          caption: `*Proccess* : ${((new Date - old) * 1)} ms`
        })
      }
      break
      //────────────────────[ END TOOLS MENU ]────────────────────

      //────────────────────[ NON COMMAND ]────────────────────
      default:
        /** eval */
        if (['>', 'eval', '=>'].some(a => m.body?.toLowerCase()?.startsWith(a))) {
          if (!m.isOwner) return m.reply('owner')
          let evalCmd = ''
          try {
            evalCmd = /await/i.test(m.text) ? eval('(async() => { ' + m.text + ' })()') : eval(m.text)
          } catch (e) {
            evalCmd = e
          }
          new Promise(async (resolve, reject) => {
              try {
                resolve(evalCmd)
              } catch (err) {
                reject(err)
              }
            })
            ?.then((res) => m.reply(format(res)))
            ?.catch((err) => m.reply(format(err)))
        }

        /** exec */
        if (['$', 'exec'].some(a => m.body?.toLowerCase()?.startsWith(a))) {
          if (!m.isOwner) return m.reply('owner')
          try {
            exec(m.text, async (err, stdout) => {
              if (err) return m.reply(Func.Format(err))
              if (stdout) return m.reply(Func.Format(stdout))
            })
          } catch (e) {
            m.reply(Func.Format(e))
          }
        }

        /** test */
        if (/^bot/i.test(m.body)) {
          m.reply(`Bot Activated "${m.pushName}"`)
        }
    }
  } catch (e) {
    console.log(e)
    m.reply(format(e))
  }
}

let file = fileURLToPath(import.meta.url)
fs.watchFile(file, () => {
  fs.unwatchFile(file)
  console.log(chalk.redBright("Update 'message.js'"))
  import(`${file}?update=${Date.now()}`)
})