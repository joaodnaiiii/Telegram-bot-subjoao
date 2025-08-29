const { Telegraf, Markup, Scenes, session } = require('telegraf');
const mongoose = require('mongoose');
const express = require('express');
const app = express();

// Conecta à DB compartilhada
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => console.log('DB conectada'));

// Models (esquemas da DB)
const configSchema = new mongoose.Schema({ key: String, value: String });
const Config = mongoose.model('Config', configSchema);
const userSchema = new mongoose.Schema({ telegramId: Number, balance: { type: Number, default: 0 }, affiliates: Array, points: { type: Number, default: 0 }, purchases: Array });
const User = mongoose.model('User', userSchema);
const productSchema = new mongoose.Schema({ name: String, price: Number, description: String, email: String, password: String, duration: String, stock: Number });
const Product = mongoose.model('Product', productSchema);
const transactionSchema = new mongoose.Schema({ userId: Number, type: String, amount: Number, date: Date });
const Transaction = mongoose.model('Transaction', transactionSchema);

// Bot Admin
const bot = new Telegraf(process.env.BOT_TOKEN);

// Dono ID
const OWNER_ID = 8206910765;

// Usa sessions e scenes para multi-step (wizards)
bot.use(session());
const stage = new Scenes.Stage();

// Scene para configs gerais
const configGeralScene = new Scenes.BaseScene('config_geral');
configGeralScene.enter((ctx) => ctx.editMessageText('Use os botões abaixo para configurar seu bot:\n📭 DESTINO DAS LOG\'S: ' + (ctx.session.logsDestination || 'Não definido') + '\n👤 LINK DO SUPORTE ATUAL: ' + (ctx.session.supportLink || 'Não definido') + '\n✂️ SEPARADOR: ===', Markup.inlineKeyboard([
  [Markup.button.callback('♻️ RENOVAR PLANO ♻️', 'renovar_plano')],
  [Markup.button.callback('🤖 REINICIAR BOT 🤖', 'reiniciar_bot')],
  [Markup.button.callback('🔴 MANUTENÇÃO (off/on)', 'toggle_manutencao')],
  [Markup.button.callback('🎧 MUDAR SUPORTE', 'mudar_suporte')],
  [Markup.button.callback('✂️ MUDAR SEPARADOR', 'mudar_separador')],
  [Markup.button.callback('📭 MUDAR DESTINO LOG', 'mudar_log')],
  [Markup.button.callback('↩️ VOLTAR', 'voltar')]
]).extra()));
configGeralScene.action('mudar_suporte', async (ctx) => {
  await ctx.reply('Envie o novo link de suporte:');
  configGeralScene.on('text', async (ctx) => {
    await Config.findOneAndUpdate({ key: 'support_link' }, { value: ctx.message.text }, { upsert: true });
    ctx.reply('Suporte atualizado!');
    ctx.scene.leave();
  });
});
// Adicione handlers para outros botões similares (ex.: mudar_separador salva em DB Config 'separador')

// Outras scenes semelhantes para: configurar admins (add/remove/list), afiliados (pontos min, multiplicador, toggle), users (transmitir, pesquisar, bonus registro), pix (token, min/max, expiracao, bonus), logins (add/remove/zerar/mudar valor), pesquisa login (toggle, add/remove imagem)

// Scene principal admin
const adminScene = new Scenes.BaseScene('admin');
adminScene.enter((ctx) => {
  if (ctx.from.id !== OWNER_ID) return ctx.reply('Acesso negado!');
  ctx.editMessageText('⚙️ DASHBOARD @\n📅 Vencimento: Não definido\n👑 Vip: Não\n🤖 Software version: 1.0\n\n📔 Métrica do business\n📊 User: ' + (User.countDocuments() || 0) + '\n📈 Receita total: R$ ' + (Transaction.aggregate([{ $match: { type: 'recarga' } }, { $group: { _id: null, total: { $sum: "$amount" } } }]) || 0) + '\n... (calcule similares)', Markup.inlineKeyboard([
    [Markup.button.callback('🔧 CONFIGURAÇÕES', 'configs')],
    [Markup.button.callback('🔖 AÇÕES', 'acoes')],
    [Markup.button.callback('🔄 TRANSAÇÕES', 'transacoes')],
    [Markup.button.callback('↩️ VOLTAR', 'voltar')]
  ]).extra());
});
adminScene.action('configs', (ctx) => ctx.scene.enter('configs_menu'));
const configsMenuScene = new Scenes.BaseScene('configs_menu');
configsMenuScene.enter((ctx) => ctx.editMessageText('🔧 MENU DE CONFIGURAÇÕES DO BOT\n👮‍♀️ Admin: ...\n💼 Dono: ' + OWNER_ID, Markup.inlineKeyboard([
  [Markup.button.callback('⚙️ CONFIGURAÇÕES GERAIS ⚙️', 'config_geral')],
  [Markup.button.callback('🕵️‍♀️ CONFIGURAR ADMINS', 'config_admins')],
  [Markup.button.callback('👥 CONFIGURAR AFILIADOS', 'config_afiliados')],
  [Markup.button.callback('👤 CONFIGURAR USUARIOS', 'config_users')],
  [Markup.button.callback('💠 CONFIGURAR PIX', 'config_pix')],
  [Markup.button.callback('🖥️ CONFIGURAR LOGINS', 'config_logins')],
  [Markup.button.callback('🔎 CONFIGURAR PESQUISA DE LOGIN', 'config_pesquisa')],
  [Markup.button.callback('↩️ VOLTAR', 'voltar')]
]).extra()));
configsMenuScene.action('config_geral', (ctx) => ctx.scene.enter('config_geral'));
// Adicione para outras (ex.: config_admins com add/remove/list admins in DB)

stage.register(adminScene, configsMenuScene, configGeralScene /* adicione todas scenes */);
bot.use(stage.middleware());

// Comandos
bot.command('admin', (ctx) => ctx.scene.enter('admin'));
bot.command('start', (ctx) => ctx.reply('Bem-vindo ao Admin Bot!'));

// Servidor para keep alive
app.get('/', (req, res) => res.send('Admin Bot rodando!'));
app.listen(process.env.PORT || 3000, () => console.log('Servidor rodando'));

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
