// ========== CLASSES ==========
class Ataque {
  constructor(nome, tipo, emoji, dano, custo, precisao = 100, efeito = null) {
    this.nome = nome;
    this.tipo = tipo;
    this.emoji = emoji;
    this.dano = dano;
    this.custo = custo;
    this.precisao = precisao;
    this.efeito = efeito || {};
  }

  executar(usuario, alvo, bot = false) {
    if (Math.random() * 100 > this.precisao) {
      addLog(`❌ ${usuario.nome} errou o ataque!`);
      return;
    }

    let danoFinal = this.dano;
    if (this.dano !== 0) {
      if (usuario.buffAtk) danoFinal += usuario.buffAtk;
      if (alvo.buffDef) danoFinal = Math.max(1, danoFinal - alvo.buffDef);
      alvo.vida = Math.max(0, alvo.vida - danoFinal);
      addLog(`${bot ? "⚔️ Inimigo" : "⚔️ Você"} usou ${this.nome}! Causou ${danoFinal} de dano em ${alvo.nome}.`);
    }

    if (this.efeito) {
      if (this.efeito.pessoal) this.aplicarBuff(usuario, this.efeito.pessoal, this.efeito.num || 0);
      if (this.efeito.inimigo) this.aplicarBuff(alvo, this.efeito.inimigo, this.efeito.num || 0);
    }
  }

  aplicarBuff(cardmon, stat, delta) {
    if (stat === 'dano') {
      cardmon.buffAtk = (cardmon.buffAtk || 0) + delta;
      addLog(`📈 ${cardmon.nome} ${delta>0?'aumentou':'diminuiu'} o ataque em ${Math.abs(delta)}.`);
    } else if (stat === 'defesa') {
      cardmon.buffDef = (cardmon.buffDef || 0) + delta;
      addLog(`🛡️ ${cardmon.nome} ${delta>0?'aumentou':'diminuiu'} a defesa em ${Math.abs(delta)}.`);
    } else if (stat === 'energia') {
      cardmon.energia = Math.min(cardmon.energiaMax, Math.max(0, cardmon.energia + delta));
      addLog(`⚡ ${cardmon.nome} ${delta>0?'ganhou':'perdeu'} ${Math.abs(delta)} de energia.`);
    }
  }
}

class Cardmon {
  constructor(nome, vidaMax, energiaMax, tipo, emoji, atks, evo = null) {
    this.nome = nome;
    this.tipo = tipo;
    this.emoji = emoji;
    this.nivel = 1;
    this.exp = 0;
    this.vidaMax = vidaMax;
    this.vida = vidaMax;
    this.energiaMax = energiaMax;
    this.energia = energiaMax;
    this.atks = atks;
    this.evo = evo;
    this.buffAtk = 0;
    this.buffDef = 0;
  }

  dormir() {
    let ganho = this.energia <= 5 ? 8 : 5;
    this.energia = Math.min(this.energiaMax, this.energia + ganho);
    this.buffAtk = 0;
    this.buffDef = 0;
    addLog(`💤 ${this.nome} descansou e recuperou ${ganho} energia! Buffs resetados.`);
  }

  ganharExp(quantidade) {
    this.exp += quantidade;
    addLog(`✨ ${this.nome} ganhou ${quantidade} de EXP!`);
    while (this.exp >= this.nivel * 100) {
      this.exp -= this.nivel * 100;
      this.levelUp();
    }
  }

  levelUp() {
    this.nivel++;
    this.vidaMax += 5;
    this.energiaMax += 3;
    this.vida = this.vidaMax;
    this.energia = this.energiaMax;
    addLog(`🎉 ${this.nome} subiu para o nível ${this.nivel}! Vida máxima +5, Energia máxima +3.`);
    this.tentarEvoluir();
  }

  tentarEvoluir() {
    for (let [evoCard, reqLevel] of Object.entries(this.evo || {})) {
      if (this.nivel >= reqLevel) {
        addLog(`🌟 ${this.nome} está evoluindo para ${evoCard.nome}!`);
        // Copiar dados
        evoCard.nivel = this.nivel;
        evoCard.exp = this.exp;
        evoCard.vidaMax = this.vidaMax;
        evoCard.vida = this.vida;
        evoCard.energiaMax = this.energiaMax;
        evoCard.energia = this.energia;
        evoCard.buffAtk = this.buffAtk;
        evoCard.buffDef = this.buffDef;
        // Substituir a referência no array do treinador (será feito fora)
        return evoCard;
      }
    }
    return this;
  }
}

class Item {
  constructor(nome, preco, efeito) {
    this.nome = nome;
    this.preco = preco;
    this.efeito = efeito;
  }

  usar(alvo) {
    for (let [stat, valor] of Object.entries(this.efeito)) {
      if (stat === 'vida') {
        alvo.vida = Math.min(alvo.vidaMax, alvo.vida + valor);
        addLog(`💚 ${alvo.nome} recuperou ${valor} de vida!`);
      } else if (stat === 'energia') {
        alvo.energia = Math.min(alvo.energiaMax, alvo.energia + valor);
        addLog(`⚡ ${alvo.nome} recuperou ${valor} de energia!`);
      }
    }
  }
}

class Jogador {
  constructor(nome, cardmons, itens = {}) {
    this.nome = nome;
    this.cardmons = cardmons;
    this.itens = itens;
    this.ativo = cardmons[0];
    this.inimigo = null;
  }

  getVivos() {
    return this.cardmons.filter(c => c.vida > 0);
  }

  trocarPara(cardmon) {
    if (cardmon === this.ativo) return false;
    if (cardmon.vida <= 0) return false;
    this.ativo = cardmon;
    addLog(`${this.nome} trocou para ${this.ativo.nome}!`);
    return true;
  }

  verificarDerrota() {
    if (this.getVivos().length === 0) {
      addLog(`💀 ${this.nome} não tem mais Cardmons!`);
      return true;
    }
    return false;
  }
}

class Player extends Jogador {}
class BOT extends Jogador {
  turno() {
    const card = this.ativo;
    if (card.energia <= 2) {
      card.dormir();
    } else {
      const ataques = card.atks.filter(a => a.custo <= card.energia);
      if (ataques.length === 0) {
        card.dormir();
      } else {
        const atk = ataques[Math.floor(Math.random() * ataques.length)];
        card.energia -= atk.custo;
        addLog(`🧠 ${this.nome} usou ${atk.nome}!`);
        atk.executar(card, this.inimigo.ativo, true);
      }
    }

    if (this.ativo.vida <= 0) {
      addLog(`${this.ativo.nome} desmaiou!`);
      const vivos = this.getVivos();
      if (vivos.length > 0) {
        this.ativo = vivos[0];
        addLog(`${this.nome} envia ${this.ativo.nome}!`);
      }
    }
  }
}

// ========== DADOS ==========
const muqueta = new Ataque('Muqueta', 'normal', '🔘', 4, 3, 90);
const empinar = new Ataque('Empinar', 'metal', '⛓', 0, 2, 100, {pessoal:'dano', num:4});
const tapa = new Ataque('Tapa', 'normal', '🔘', 3, 2, 95);
const borbulhar = new Ataque('Borbulhar', 'agua', '💧', 0, 1, 100, {inimigo:'precisao', num:-1});
const afiar = new Ataque('Afiar', 'normal', '🔘', 0, 2, 100, {pessoal:'dano', num:2});

const Karekudo = new Cardmon('Karekudo', 80, 50, ['agua','psi'], '💧🧠', []);
const Kareka = new Cardmon('Kareka', 45, 30, ['agua'], '💧', [], {Karekudo:34});
const KleKle = new Cardmon('KleKle', 10, 15, ['agua'], '💧', [tapa, borbulhar], {Kareka:14});

const Motoka = new Cardmon('Motoka', 84, 45, ['metal','fogo'], '⛓️🔥', []);
const Monark = new Cardmon('Monark', 50, 28, ['metal'], '⛓️', [], {Motoka:35});
const Totoka = new Cardmon('Totoka', 12, 14, ['metal'], '⛓️', [muqueta, empinar], {Monark:14});

const Mapinguari = new Cardmon('Mapinguari', 87, 46, ['grama','lutador'], '🌳🥊', []);
const Cacidro = new Cardmon('Cacídro', 42, 34, ['grama','lutador'], '🌳🥊', [], {Mapinguari:36});
const Balaio = new Cardmon('Balaio', 14, 15, ['grama'], '🌳', [tapa, afiar], {Cacidro:15});

const pocaoP = new Item('Poção-P', 5, {vida:5});

let player = new Player('Vitor', [KleKle], {[pocaoP]: 2});
let bot = new BOT('Treinador Selvagem', [Balaio, Totoka]);

// ========== VARIÁVEIS GLOBAIS ==========
let battleActive = true;
let waitingForPlayer = true;
let playerTurnLock = false;

// DOM elements
const logDiv = document.getElementById('log');
const moveContainer = document.getElementById('move-buttons');
const switchContainer = document.getElementById('switch-container');
const itemsContainer = document.getElementById('items-container');
const sleepBtn = document.getElementById('sleep-btn');
const switchBtn = document.getElementById('switch-btn');
const itemsBtn = document.getElementById('items-btn');
const fleeBtn = document.getElementById('flee-btn');
const itemCountSpan = document.getElementById('item-count');
const playerLevelSpan = document.getElementById('player-level');

// ========== FUNÇÕES AUXILIARES ==========
function addLog(msg) {
  const p = document.createElement('div');
  p.textContent = msg;
  logDiv.appendChild(p);
  p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  if (logDiv.children.length > 40) logDiv.removeChild(logDiv.children[0]);
}

function updateUI() {
  // Jogador
  const p = player.ativo;
  document.getElementById('player-name').innerText = p.nome;
  document.getElementById('player-emoji').innerText = p.emoji;
  document.getElementById('player-hp').innerText = p.vida;
  document.getElementById('player-hp-max').innerText = p.vidaMax;
  document.getElementById('player-energy').innerText = p.energia;
  document.getElementById('player-energy-max').innerText = p.energiaMax;
  document.getElementById('player-hp-fill').style.width = (p.vida / p.vidaMax * 100) + '%';
  document.getElementById('player-energy-fill').style.width = (p.energia / p.energiaMax * 100) + '%';
  playerLevelSpan.innerText = p.nivel;

  // Oponente
  const o = bot.ativo;
  document.getElementById('opponent-name').innerText = o.nome;
  document.getElementById('opponent-emoji').innerText = o.emoji;
  document.getElementById('opponent-hp').innerText = o.vida;
  document.getElementById('opponent-hp-max').innerText = o.vidaMax;
  document.getElementById('opponent-energy').innerText = o.energia;
  document.getElementById('opponent-energy-max').innerText = o.energiaMax;
  document.getElementById('opponent-hp-fill').style.width = (o.vida / o.vidaMax * 100) + '%';
  document.getElementById('opponent-energy-fill').style.width = (o.energia / o.energiaMax * 100) + '%';

  // Itens
  let totalItems = 0;
  for (let qtd of Object.values(player.itens)) totalItems += qtd;
  itemCountSpan.innerText = totalItems;
}

function renderMoves() {
  moveContainer.innerHTML = '';
  player.ativo.atks.forEach((atk) => {
    const btn = document.createElement('button');
    btn.className = 'move-btn';
    btn.innerHTML = `${atk.emoji} ${atk.nome} (${atk.custo}⚡)`;
    if (player.ativo.energia < atk.custo) btn.classList.add('disabled');
    btn.onclick = () => {
      if (!battleActive || !waitingForPlayer || playerTurnLock) return;
      if (player.ativo.energia < atk.custo) {
        addLog(`❌ Energia insuficiente para ${atk.nome}!`);
        return;
      }
      playerTurnLock = true;
      waitingForPlayer = false;
      player.ativo.energia -= atk.custo;
      addLog(`Você usou ${atk.nome}!`);
      atk.executar(player.ativo, bot.ativo, false);
      updateUI();
      afterPlayerAction();
    };
    moveContainer.appendChild(btn);
  });
}

async function afterPlayerAction() {
  if (bot.ativo.vida <= 0) {
    addLog(`${bot.ativo.nome} desmaiou!`);
    const vivosBot = bot.getVivos();
    if (vivosBot.length > 0) {
      bot.ativo = vivosBot[0];
      addLog(`${bot.nome} envia ${bot.ativo.nome}!`);
      updateUI();
    } else {
      endBattle('player');
      return;
    }
  }

  if (battleActive) await botTurn();
}

async function botTurn() {
  if (!battleActive) return;
  addLog(`--- Turno do ${bot.nome} ---`);
  bot.turno();
  updateUI();

  if (player.ativo.vida <= 0) {
    addLog(`${player.ativo.nome} desmaiou!`);
    const vivosPlayer = player.getVivos();
    if (vivosPlayer.length > 0) {
      player.ativo = vivosPlayer[0];
      addLog(`${player.nome} envia ${player.ativo.nome}!`);
      updateUI();
      renderMoves();
    } else {
      endBattle('bot');
      return;
    }
  }

  waitingForPlayer = true;
  playerTurnLock = false;
  renderMoves();
  updateUI();
}

function endBattle(winner) {
  battleActive = false;
  waitingForPlayer = false;
  addLog(`🏆 FIM DE JOGO! Vencedor: ${winner === 'player' ? player.nome : bot.nome}!`);

  if (winner === 'player') {
    // Dar experiência ao Cardmon ativo do vencedor
    player.ativo.ganharExp(50);
    // Verificar evolução e substituir na party se necessário
    const evolved = player.ativo.tentarEvoluir();
    if (evolved !== player.ativo) {
      const idx = player.cardmons.indexOf(player.ativo);
      player.cardmons[idx] = evolved;
      player.ativo = evolved;
      addLog(`🎉 ${evolved.nome} evoluiu!`);
      updateUI();
      renderMoves();
    }
  }

  document.querySelectorAll('.move-btn, .action-btn').forEach(btn => btn.disabled = true);
  const finalMsg = winner === 'player' ? '🎉 PARABÉNS! VOCÊ VENCEU!' : '💀 VOCÊ FOI DERROTADO... TENTE NOVAMENTE!';
  addLog(finalMsg);
}

// ========== AÇÕES DO PLAYER ==========
function acaoDormir() {
  if (!battleActive || !waitingForPlayer || playerTurnLock) return;
  playerTurnLock = true;
  waitingForPlayer = false;
  player.ativo.dormir();
  updateUI();
  afterPlayerAction();
}

function mostrarTrocar() {
  if (!battleActive || !waitingForPlayer || playerTurnLock) return;
  const vivos = player.getVivos();
  if (vivos.length <= 1) {
    addLog("❌ Não há outros Cardmons para trocar!");
    return;
  }
  switchContainer.classList.remove('hidden');
  switchContainer.innerHTML = '<strong>🔁 ESCOLHA UM CARDMON:</strong><br>';
  vivos.forEach(c => {
    const btn = document.createElement('span');
    btn.className = 'switch-option';
    btn.innerText = `${c.emoji} ${c.nome}  ❤️${c.vida}/${c.vidaMax}  ⚡${c.energia}/${c.energiaMax}`;
    btn.onclick = () => {
      if (c === player.ativo) {
        addLog("Já está em campo!");
      } else {
        player.ativo = c;
        addLog(`${player.nome} trocou para ${c.nome}!`);
        updateUI();
        renderMoves();
      }
      switchContainer.classList.add('hidden');
    };
    switchContainer.appendChild(btn);
  });
}

function mostrarItens() {
  if (!battleActive || !waitingForPlayer || playerTurnLock) return;
  const itensKeys = Object.keys(player.itens);
  if (itensKeys.length === 0) {
    addLog("❌ Nenhum item disponível.");
    return;
  }
  itemsContainer.classList.remove('hidden');
  itemsContainer.innerHTML = '<strong>🧪 USAR ITEM:</strong><br>';
  for (let [item, qtd] of Object.entries(player.itens)) {
    if (qtd <= 0) continue;
    const btn = document.createElement('span');
    btn.className = 'switch-option';
    btn.innerText = `${item.nome} x${qtd}`;
    btn.onclick = () => {
      item.usar(player.ativo);
      player.itens[item]--;
      if (player.itens[item] === 0) delete player.itens[item];
      updateUI();
      itemsContainer.classList.add('hidden');
      playerTurnLock = true;
      waitingForPlayer = false;
      afterPlayerAction();
    };
    itemsContainer.appendChild(btn);
  }
}

function fugir() {
  if (!battleActive || !waitingForPlayer || playerTurnLock) return;
  const chance = 0.5;
  if (Math.random() < chance) {
    addLog("🏃‍♂️ Você fugiu da batalha!");
    endBattle('fugiu');
  } else {
    addLog("❌ Não conseguiu fugir!");
    playerTurnLock = true;
    waitingForPlayer = false;
    afterPlayerAction();
  }
}

// ========== INICIALIZAÇÃO ==========
function init() {
  player.inimigo = bot;
  bot.inimigo = player;
  battleActive = true;
  waitingForPlayer = true;
  playerTurnLock = false;
  updateUI();
  renderMoves();

  sleepBtn.onclick = acaoDormir;
  switchBtn.onclick = mostrarTrocar;
  itemsBtn.onclick = mostrarItens;
  fleeBtn.onclick = fugir;

  logDiv.innerHTML = '';
  addLog("🔥 BATALHA INICIADA! ESCOLHA SUA AÇÃO.");
}

init();
