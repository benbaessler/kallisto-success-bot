const {Client, MessageEmbed, SystemChannelFlags} = require('discord.js')
const readJsonSync = require('read-json-sync')
const Stream = require('stream').Transform
const Twitter = require('twitter')
const https = require('https')                                  
const fs = require('fs')
require('discord-reply')


const data = readJsonSync('data.json')
// Discord Bot Client
const client = new Client()
const twitter = new Twitter({
  consumer_key: data.twitterApiKey,
  consumer_secret: data.twitterApiSecret,
  access_token_key: data.twitterAccessToken,
  access_token_secret: data.twitterAccessSecret
})

client.on('message', message => {
  if (message.attachments.size === 0) return
  if (message.author === client.user) return
  if (message.channel.id !== data.discordChannelId) return

  let mediaUrl
  let mediaType
  let mediaData
  let tweetId

  message.attachments.forEach(attachment => {

    mediaUrl = attachment.url
    mediaType = attachment.url.split('.')[attachment.url.split('.').length - 1]
  })

  // Download file from URL
  https.request(mediaUrl, (response) => {
    var data = new Stream()
  
    response.on('data', (chunk) => {                                       
      data.push(chunk)
    })                                                                         
  
    response.on('end', () => {                                             
      fs.writeFileSync(`temp/media.${mediaType}`, data.read())
    })                                                                      
  }).end()

  mediaData = fs.readFileSync(`temp/media.${mediaType}`)

  // Upload file
  twitter.post('media/upload', {media: mediaData}, (error, media, response) => {
    if (error) {
      console.error(error)
    } else {
      
      const status = {
        status: `Success from ${message.author.tag} (Testing)`,
        media_ids: media.media_id_string
      }

      // Post Tweet
      twitter.post('statuses/update', status, (error, tweet, response) => {
        if (error) throw error
        tweetUrl = `https://twitter.com/${data.twitterAccountUrl.split('/')[data.twitterAccountUrl.split('/').length - 1]}/status/${JSON.parse(response.body).id_str}`
        console.log(`New Tweet: ${tweetUrl}`)

        const _channel = client.channels.cache.get(data.discordChannelId)
        _channel.send(new MessageEmbed()
          .setColor(data.embedSuccessColor)
          .setURL(tweetUrl)
          .setTitle('Success Tweet posted!')
          .setDescription(`Congratulations, ${message.author}! 🥳\nIf you want to delete your Tweet, react with 🗑️.`)
          .setFooter('Kallisto Success Bot • Made with ♡', data.logoImageUrl)
        ).then((_message) => _message.react('🗑️'))
      })
    }
  })
}) 

client.on('messageReactionAdd', (reaction, user) => {
  if (user.bot) return
  if (reaction.emoji.name !== '🗑️') return
  if (reaction.message.channel.id !== data.discordChannelId) return

  const _target = reaction.message.embeds[0]['description'].split(' ')[1].replace('!', '')
  if (_target !== `<@${user.id}>`) return

  const _split = reaction.message.embeds[0].url.split('/')
  const tweetId = _split[_split.length - 1]

  reaction.message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error))

  // Delete Tweet
  twitter.post(`statuses/destroy/${tweetId}.json`, (error) => {
    if (error) {
      console.error(error)
      return
    }
    console.log(`Tweet deleted - ${user.tag}`)
    
    // Send deletion confirmation message
    reaction.message.lineReplyNoMention(new MessageEmbed()
      .setColor(data.embedDeleteColor)
      .setURL(data.twitterAccountUrl)
      .setTitle('Tweet removed!')
      .setDescription(`<@${user.id}>'s Success Tweet was deleted.`)
      .setFooter('Kallisto Success Bot • Made with ♡', 'https://i.imgur.com/Gh0jOj0.png')
    )
  })
})

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.login(data.discordBotToken)