// ========== CLASSES (CARDMON E BATALHA) ==========
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
            return false;
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
        return true;
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
    constructor(nome, vidaMax, energiaMax, tipo, emoji, atks, spriteUrl, evo = null) {
        this.nome = nome;
        this.tipo = tipo;
        this.emoji = emoji;
        this.spriteUrl = spriteUrl;
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
        addLog(`🎉 ${this.nome} subiu para o nível ${this.nivel}! Vida +5, Energia +3.`);
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
const tapa = new Ataque('Tapa', 'normal', '🔘', 3, 2, 95);
const borbulhar = new Ataque('Borbulhar', 'agua', '💧', 0, 1, 100, {inimigo:'precisao', num:-1});
const muqueta = new Ataque('Muqueta', 'normal', '🔘', 4, 3, 90);
const empinar = new Ataque('Empinar', 'metal', '⛓', 0, 2, 100, {pessoal:'dano', num:4});
const afiar = new Ataque('Afiar', 'normal', '🔘', 0, 2, 100, {pessoal:'dano', num:2});

// Evoluções
const Karekudo = new Cardmon('Karekudo', 80, 50, ['agua','psi'], '💧🧠', [], 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/9.png');
const Kareka = new Cardmon('Kareka', 45, 30, ['agua'], '💧', [], 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/8.png', {Karekudo:34});
const KleKle = new Cardmon('KleKle', 10, 15, ['agua'], '💧', [tapa, borbulhar], 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/7.png', {Kareka:14});

const Motoka = new Cardmon('Motoka', 84, 45, ['metal','fogo'], '⛓️🔥', [], 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/462.png');
const Monark = new Cardmon('Monark', 50, 28, ['metal'], '⛓️', [], 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/82.png', {Motoka:35});
const Totoka = new Cardmon('Totoka', 12, 14, ['metal'], '⛓️', [muqueta, empinar], 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/81.png', {Monark:14});

const Mapinguari = new Cardmon('Mapinguari', 87, 46, ['grama','lutador'], '🌳🥊', [], 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/3.png');
const Cacidro = new Cardmon('Cacídro', 42, 34, ['grama','lutador'], '🌳🥊', [], 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/2.png', {Mapinguari:36});
const Balaio = new Cardmon('Balaio', 14, 15, ['grama'], '🌳', [tapa, afiar], 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/1.png', {Cacidro:15});

const pocaoP = new Item('Poção-P', 5, {vida:5});

let player = new Player('Vitor', [KleKle], {[pocaoP]: 2});
let bot = new BOT('Treinador Selvagem', [Balaio, Totoka]);

// ========== OVERWORLD ==========
const canvas = document.getElementById('world-canvas');
const ctx = canvas.getContext('2d');
const worldScreen = document.getElementById('world-screen');
const battleScreen = document.getElementById('battle-screen');

// Configuração do mapa
const TILE_SIZE = 32;
const MAP_WIDTH = 25;
const MAP_HEIGHT = 19;
canvas.width = TILE_SIZE * MAP_WIDTH;
canvas.height = TILE_SIZE * MAP_HEIGHT;

let playerX = 12, playerY = 9;
let npcX = 18, npcY = 12;
let inBattle = false;

// Imagens dos sprites (usando emojis simples para evitar carregamento externo)
const playerSprite = '🧑';
const npcSprite = '👤';

function drawMap() {
    // Fundo de grama
    for (let i = 0; i < MAP_WIDTH; i++) {
        for (let j = 0; j < MAP_HEIGHT; j++) {
            ctx.fillStyle = (i + j) % 2 === 0 ? '#6a9a5a' : '#5a8a4a';
            ctx.fillRect(i * TILE_SIZE, j * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#4a6a3a';
            ctx.strokeRect(i * TILE_SIZE, j * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
    // Desenha NPC
    ctx.font = `${TILE_SIZE}px monospace`;
    ctx.fillStyle = '#ff6666';
    ctx.fillText(npcSprite, npcX * TILE_SIZE, npcY * TILE_SIZE + TILE_SIZE - 4);
    // Desenha player
    ctx.fillStyle = '#44aaff';
    ctx.fillText(playerSprite, playerX * TILE_SIZE, playerY * TILE_SIZE + TILE_SIZE - 4);
}

function movePlayer(dx, dy) {
    if (inBattle) return;
    const newX = playerX + dx;
    const newY = playerY + dy;
    if (newX >= 0 && newX < MAP_WIDTH && newY >= 0 && newY < MAP_HEIGHT) {
        playerX = newX;
        playerY = newY;
        drawMap();
        checkCollision();
    }
}

function checkCollision() {
    if (playerX === npcX && playerY === npcY) {
        startBattle();
    }
}

function startBattle() {
    inBattle = true;
    document.body.classList.add('flash');
    setTimeout(() => {
        document.body.classList.remove('flash');
        worldScreen.classList.add('hidden');
        battleScreen.classList.remove('hidden');
        initBattle();
    }, 800);
}

// ========== BATALHA ==========
let currentPlayer, currentEnemy;
let battleActive = true;
let waitingForPlayer = true;
let playerTurnLock = false;
let currentLog = [];

function addLog(msg) {
    currentLog.push(msg);
    const logDiv = document.getElementById('battle-log');
    const p = document.createElement('div');
    p.textContent = msg;
    logDiv.appendChild(p);
    p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (logDiv.children.length > 40) logDiv.removeChild(logDiv.children[0]);
}

function updateBattleUI() {
    // Jogador
    const p = currentPlayer.ativo;
    document.getElementById('player-name').innerText = p.nome;
    document.getElementById('player-level').innerText = p.nivel;
    document.getElementById('player-hp').innerText = p.vida;
    document.getElementById('player-hp-max').innerText = p.vidaMax;
    document.getElementById('player-energy').innerText = p.energia;
    document.getElementById('player-energy-max').innerText = p.energiaMax;
    document.getElementById('player-hp-fill').style.width = (p.vida / p.vidaMax * 100) + '%';
    document.getElementById('player-energy-fill').style.width = (p.energia / p.energiaMax * 100) + '%';
    document.getElementById('player-sprite').src = p.spriteUrl;

    // Oponente
    const o = currentEnemy.ativo;
    document.getElementById('opponent-name').innerText = o.nome;
    document.getElementById('opponent-level').innerText = o.nivel;
    document.getElementById('opponent-hp').innerText = o.vida;
    document.getElementById('opponent-hp-max').innerText = o.vidaMax;
    document.getElementById('opponent-energy').innerText = o.energia;
    document.getElementById('opponent-energy-max').innerText = o.energiaMax;
    document.getElementById('opponent-hp-fill').style.width = (o.vida / o.vidaMax * 100) + '%';
    document.getElementById('opponent-energy-fill').style.width = (o.energia / o.energiaMax * 100) + '%';
    document.getElementById('opponent-sprite').src = o.spriteUrl;
}

function renderMoveButtons() {
    const container = document.getElementById('action-buttons');
    container.innerHTML = '';
    currentPlayer.ativo.atks.forEach(atk => {
        const btn = document.createElement('button');
        btn.innerText = `${atk.emoji} ${atk.nome} (${atk.custo}⚡)`;
        btn.disabled = currentPlayer.ativo.energia < atk.custo;
        btn.onclick = () => {
            if (!battleActive || !waitingForPlayer || playerTurnLock) return;
            if (currentPlayer.ativo.energia < atk.custo) {
                addLog(`❌ Energia insuficiente para ${atk.nome}!`);
                return;
            }
            playerTurnLock = true;
            waitingForPlayer = false;
            currentPlayer.ativo.energia -= atk.custo;
            addLog(`Você usou ${atk.nome}!`);
            atk.executar(currentPlayer.ativo, currentEnemy.ativo, false);
            updateBattleUI();
            afterPlayerAction();
        };
        container.appendChild(btn);
    });
}

async function afterPlayerAction() {
    if (currentEnemy.ativo.vida <= 0) {
        addLog(`${currentEnemy.ativo.nome} desmaiou!`);
        const vivos = currentEnemy.getVivos();
        if (vivos.length > 0) {
            currentEnemy.ativo = vivos[0];
            addLog(`${currentEnemy.nome} envia ${currentEnemy.ativo.nome}!`);
            updateBattleUI();
        } else {
            endBattle('player');
            return;
        }
    }
    if (battleActive) await botTurn();
}

async function botTurn() {
    if (!battleActive) return;
    addLog(`--- Turno do ${currentEnemy.nome} ---`);
    currentEnemy.turno();
    updateBattleUI();

    if (currentPlayer.ativo.vida <= 0) {
        addLog(`${currentPlayer.ativo.nome} desmaiou!`);
        const vivos = currentPlayer.getVivos();
        if (vivos.length > 0) {
            currentPlayer.ativo = vivos[0];
            addLog(`${currentPlayer.nome} envia ${currentPlayer.ativo.nome}!`);
            updateBattleUI();
            renderMoveButtons();
        } else {
            endBattle('bot');
            return;
        }
    }
    waitingForPlayer = true;
    playerTurnLock = false;
    renderMoveButtons();
    updateBattleUI();
}

function endBattle(winner) {
    battleActive = false;
    waitingForPlayer = false;
    addLog(`🏆 FIM DE JOGO! Vencedor: ${winner === 'player' ? currentPlayer.nome : currentEnemy.nome}!`);

    if (winner === 'player') {
        currentPlayer.ativo.ganharExp(50);
        const evolved = currentPlayer.ativo.tentarEvoluir();
        if (evolved !== currentPlayer.ativo) {
            const idx = currentPlayer.cardmons.indexOf(currentPlayer.ativo);
            currentPlayer.cardmons[idx] = evolved;
            currentPlayer.ativo = evolved;
            addLog(`🎉 ${evolved.nome} evoluiu!`);
            updateBattleUI();
            renderMoveButtons();
        }
    }

    document.querySelectorAll('#action-buttons button, .extra-actions button').forEach(btn => btn.disabled = true);
    const finalMsg = winner === 'player' ? '🎉 PARABÉNS! VOCÊ VENCEU!' : '💀 VOCÊ FOI DERROTADO...';
    addLog(finalMsg);

    // Volta para o mundo após 3 segundos
    setTimeout(() => {
        battleScreen.classList.add('hidden');
        worldScreen.classList.remove('hidden');
        inBattle = false;
        // Reposiciona o jogador para não colidir novamente
        playerX = 12; playerY = 9;
        drawMap();
        // Reativa os botões para a próxima batalha
        document.querySelectorAll('#action-buttons button, .extra-actions button').forEach(btn => btn.disabled = false);
    }, 3000);
}

function initBattle() {
    battleActive = true;
    waitingForPlayer = true;
    playerTurnLock = false;
    currentLog = [];
    document.getElementById('battle-log').innerHTML = '';
    addLog("🔥 Batalha iniciada! Escolha sua ação.");

    // Configura os jogadores (cópias profundas para não alterar original)
    currentPlayer = new Player(player.nome, player.cardmons.map(c => c), {...player.itens});
    currentEnemy = new BOT(bot.nome, bot.cardmons.map(c => c), {...bot.itens});

    currentPlayer.inimigo = currentEnemy;
    currentEnemy.inimigo = currentPlayer;

    updateBattleUI();
    renderMoveButtons();

    // Adiciona eventos dos botões extras
    document.getElementById('sleep-btn').onclick = () => {
        if (!battleActive || !waitingForPlayer || playerTurnLock) return;
        playerTurnLock = true;
        waitingForPlayer = false;
        currentPlayer.ativo.dormir();
        updateBattleUI();
        afterPlayerAction();
    };
    document.getElementById('switch-btn').onclick = () => {
        if (!battleActive || !waitingForPlayer || playerTurnLock) return;
        const vivos = currentPlayer.getVivos();
        if (vivos.length <= 1) {
            addLog("❌ Não há outros Cardmons para trocar!");
            return;
        }
        const menu = document.getElementById('switch-menu');
        menu.innerHTML = '<strong>🔁 Trocar para:</strong>';
        vivos.forEach(c => {
            const opt = document.createElement('div');
            opt.className = 'menu-option';
            opt.innerText = `${c.emoji} ${c.nome}  ❤️${c.vida}/${c.vidaMax}`;
            opt.onclick = () => {
                if (c !== currentPlayer.ativo) {
                    currentPlayer.ativo = c;
                    addLog(`${currentPlayer.nome} trocou para ${c.nome}!`);
                    updateBattleUI();
                    renderMoveButtons();
                }
                menu.classList.add('hidden');
            };
            menu.appendChild(opt);
        });
        menu.classList.remove('hidden');
    };
    document.getElementById('items-btn').onclick = () => {
        if (!battleActive || !waitingForPlayer || playerTurnLock) return;
        const items = Object.keys(currentPlayer.itens);
        if (items.length === 0) {
            addLog("❌ Nenhum item disponível.");
            return;
        }
        const menu = document.getElementById('items-menu');
        menu.innerHTML = '<strong>🧪 Usar item:</strong>';
        for (let [item, qtd] of Object.entries(currentPlayer.itens)) {
            if (qtd <= 0) continue;
            const opt = document.createElement('div');
            opt.className = 'menu-option';
            opt.innerText = `${item.nome} x${qtd}`;
            opt.onclick = () => {
                item.usar(currentPlayer.ativo);
                currentPlayer.itens[item]--;
                if (currentPlayer.itens[item] === 0) delete currentPlayer.itens[item];
                updateBattleUI();
                menu.classList.add('hidden');
                playerTurnLock = true;
                waitingForPlayer = false;
                afterPlayerAction();
            };
            menu.appendChild(opt);
        }
        menu.classList.remove('hidden');
    };
    document.getElementById('flee-btn').onclick = () => {
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
    };
}

// ========== CONTROLES ==========
window.addEventListener('keydown', (e) => {
    if (inBattle) return;
    switch (e.key) {
        case 'ArrowUp': movePlayer(0, -1); break;
        case 'ArrowDown': movePlayer(0, 1); break;
        case 'ArrowLeft': movePlayer(-1, 0); break;
        case 'ArrowRight': movePlayer(1, 0); break;
        default: return;
    }
    e.preventDefault();
});

// Inicialização do mundo
drawMap();
