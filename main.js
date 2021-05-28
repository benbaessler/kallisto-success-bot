const {Client, MessageEmbed} = require('discord.js')
const readJsonSync = require('read-json-sync')
const Twitter = require('twitter')
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

  let imageUrl
  message.attachments.forEach(attachment => {
    imageUrl = attachment.url
  })

  // Post Tweet
  twitter.post('statuses/update', {
    status: `Success from ${message.author.tag} (Testing)`,
    // attachment_url: imageUrl
  }, (error, tweet, response) => {
    if (error) throw error
    console.log('New Tweet')
  })

  const _channel = client.channels.cache.get(data.discordChannelId)
  _channel.send(new MessageEmbed()
    .setColor(data.embedSuccessColor)
    // Insert Tweet link
    .setURL('https://twitter.com/')
    .setTitle('Success Tweet posted!')
    .setDescription(`Congratulations, ${message.author}! 🥳\nIf you want to delete your Tweet, react with 🗑️.`)
    .setFooter('Kallisto Success Bot • Made with ♡', data.logoImageUrl)
  ).then((_message) => _message.react('🗑️'))
})

client.on('messageReactionAdd', (reaction, user) => {
  if (user.bot) return
  if (reaction.emoji.name !== '🗑️') return
  if (reaction.message.channel.id !== data.discordChannelId) return

  const _target = reaction.message.embeds[0]['description'].split(' ')[1].replace('!', '')
  if (_target !== `<@${user.id}>`) return

  reaction.message.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error))

  // Delete Tweet

  reaction.message.lineReplyNoMention(new MessageEmbed()
    .setColor(data.embedDeleteColor)
    .setURL(data.twitterAccountUrl)
    .setTitle('Tweet removed!')
    .setDescription(`<@${user.id}>'s Success Tweet was deleted.`)
    .setFooter('Kallisto Success Bot • Made with ♡', 'https://i.imgur.com/Gh0jOj0.png')
  )
})

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

client.login(data.discordBotToken)