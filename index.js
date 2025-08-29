const express = require('express');
const { Telegraf } = require('telegraf');
const app = express();

// Usa a variável de ambiente para o token
const bot = new Telegraf(process.env.BOT_TOKEN);

// Comando /start
bot.start((ctx) => ctx.reply('Olá! Eu sou seu bot. Envie /ping para testar!'));

// Comando /ping
bot.command('ping', (ctx) => ctx.reply('Pong!'));

// Inicia o bot
bot.launch();

// Configura o servidor Express para manter o app ativo
app.get('/', (req, res) => res.send('Bot está rodando!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// Lida com paradas graciosas
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
