// CONFIGURAÇÕES DO MUNDO
const playerEl = document.getElementById('player');
const npcEl = document.getElementById('npc');
const worldScreen = document.getElementById('world-screen');
const battleScreen = document.getElementById('battle-screen');

let playerPos = { x: 50, y: 50 };
let inBattle = false;

// MOVIMENTAÇÃO
window.addEventListener('keydown', (e) => {
    if (inBattle) return;

    const speed = 10;
    if (e.key === 'ArrowUp') playerPos.y -= speed;
    if (e.key === 'ArrowDown') playerPos.y += speed;
    if (e.key === 'ArrowLeft') playerPos.x -= speed;
    if (e.key === 'ArrowRight') playerPos.x += speed;

    playerEl.style.left = playerPos.x + 'px';
    playerEl.style.top = playerPos.y + 'px';

    checkCollision();
});

function checkCollision() {
    const pRect = playerEl.getBoundingClientRect();
    const nRect = npcEl.getBoundingClientRect();

    if (!(pRect.right < nRect.left || pRect.left > nRect.right || pRect.bottom < nRect.top || pRect.top > nRect.bottom)) {
        startBattle();
    }
}

// LÓGICA DE BATALHA
function startBattle() {
    inBattle = true;
    document.body.classList.add('flash'); // Efeito de transição
    
    setTimeout(() => {
        document.body.classList.remove('flash');
        worldScreen.classList.add('hidden');
        battleScreen.classList.remove('hidden');
        initBattle();
    }, 1500);
}

const gameData = {
    player: { name: "Omastar", hp: 100, maxHp: 100, en: 50, maxEn: 50 },
    enemy: { name: "Corsola", hp: 100, maxHp: 100 }
};

function initBattle() {
    updateUI();
    const actions = document.getElementById('actions');
    actions.innerHTML = `
        <button onclick="attack('Tapa', 10, 5)">Tapa (5 EN)</button>
        <button onclick="attack('Jato Água', 25, 15)">Jato Água (15 EN)</button>
        <button onclick="attack('Borbulhar', 15, 8)">Borbulhar (8 EN)</button>
        <button onclick="run()">Fugir</button>
    `;
}

function attack(nome, dano, custo) {
    if (gameData.player.en < custo) {
        log("Sem energia!");
        return;
    }

    // Turno do Jogador
    gameData.player.en -= custo;
    gameData.enemy.hp -= dano;
    log(`Omastar usou ${nome}! Deu ${dano} de dano.`);
    updateUI();

    if (gameData.enemy.hp <= 0) {
        log("Você venceu! O Corsola desmaiou.");
        setTimeout(endBattle, 2000);
        return;
    }

    // Turno do Inimigo
    setTimeout(() => {
        const dmg = 15;
        gameData.player.hp -= dmg;
        log(`Corsola usou Tackle! Deu ${dmg} de dano.`);
        updateUI();
        if (gameData.player.hp <= 0) log("Você perdeu...");
    }, 1000);
}

function updateUI() {
    document.getElementById('p-hp').style.width = (gameData.player.hp / gameData.player.maxHp * 100) + "%";
    document.getElementById('p-en').style.width = (gameData.player.en / gameData.player.maxEn * 100) + "%";
    document.getElementById('e-hp').style.width = (gameData.enemy.hp / gameData.enemy.maxHp * 100) + "%";
}

function log(msg) {
    document.getElementById('log').innerHTML += `<br>> ${msg}`;
    const logBox = document.getElementById('log');
    logBox.scrollTop = logBox.scrollHeight;
}

function run() {
    log("Você fugiu!");
    setTimeout(endBattle, 1000);
}

function endBattle() {
    battleScreen.classList.add('hidden');
    worldScreen.classList.remove('hidden');
    inBattle = false;
    // Reseta posição para não colidir imediatamente
    playerPos = { x: 50, y: 50 };
    playerEl.style.left = '50px';
    playerEl.style.top = '50px';
}
