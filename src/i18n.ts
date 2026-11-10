import type { GameDefinition } from './types';

export const locales = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'de', 'es', 'pt'] as const;
export type Locale = typeof locales[number];
export type LocaleOption = Locale | 'auto' | (string & {});

// Columns follow `locales`. Keep all built-in UI and accessible labels together.
export const messages = {
  widget: ['Game verification', '游戏验证', '遊戲驗證', 'ゲーム認証', '게임 인증', 'Vérification par jeu', 'Spielverifizierung', 'Verificación por juego', 'Verificação por jogo'],
  tetris: ['Tetris', '俄罗斯方块', '俄羅斯方塊', 'テトリス', '테트리스', 'Tetris', 'Tetris', 'Tetris', 'Tetris'],
  '2048': ['2048', '2048', '2048', '2048', '2048', '2048', '2048', '2048', '2048'],
  minesweeper: ['Minesweeper', '扫雷', '踩地雷', 'マインスイーパ', '지뢰찾기', 'Démineur', 'Minen', 'Buscaminas', 'Campo minado'],
  breakout: ['Breakout', '打砖块', '打磚塊', 'ブロック崩し', '벽돌깨기', 'Casse-briques', 'Breakout', 'Rompebloques', 'Quebra-blocos'],
  fps: ['FPS', 'FPS', 'FPS', 'FPS', 'FPS', 'FPS', 'FPS', 'FPS', 'FPS'],
  adventure: ['Adventure', '冒险', '冒險', '冒険', '모험', 'Aventure', 'Abenteuer', 'Aventura', 'Aventura'],
  racing: ['Racing', '赛车', '賽車', 'レース', '레이싱', 'Course', 'Rennen', 'Carreras', 'Corrida'],
  brake: ['Brake', '刹车', '煞車', 'ブレーキ', '브레이크', 'Freiner', 'Bremsen', 'Frenar', 'Frear'],
  boost: ['Accelerate', '加速', '加速', '加速', '가속', 'Accélérer', 'Beschleunigen', 'Acelerar', 'Acelerar'],
  meters: ['meters', '米', '公尺', 'メートル', '미터', 'mètres', 'Meter', 'metros', 'metros'],
  racingHelp: ['A/D or arrows: steer · S/down: brake · W/up/Space: accelerate · Drag to steer · Reach the finish with three lives', 'A/D 或方向键转向 · S/↓ 刹车 · W/↑/空格加速 · 拖动转向 · 三次碰撞前跑到终点', 'A/D 或方向鍵轉向 · S/↓ 煞車 · W/↑/空白鍵加速 · 拖曳轉向 · 三次碰撞前抵達終點', 'A/D・矢印：ハンドル · S/↓：ブレーキ · W/↑/Space：加速 · ドラッグで操縦 · 3回衝突する前にゴール', 'A/D·방향키: 조향 · S/↓: 브레이크 · W/↑/Space: 가속 · 드래그로 조향 · 세 번 충돌하기 전에 완주', 'A/D ou flèches : direction · S/↓ : frein · W/↑/Espace : accélérer · Glisser : direction · Terminez avant trois collisions', 'A/D oder Pfeile: lenken · S/↓: bremsen · W/↑/Leertaste: beschleunigen · Ziehen zum Lenken · Ziel vor drei Kollisionen erreichen', 'A/D o flechas: girar · S/↓: frenar · W/↑/Espacio: acelerar · Arrastra para girar · Llega antes de tres choques', 'A/D ou setas: direção · S/↓: frear · W/↑/Espaço: acelerar · Arraste para dirigir · Termine antes de três colisões'],
  racingBoard: ['Distance {distance}/{target} m, speed {speed} km/h, {lives} lives', '距离 {distance}/{target} 米，速度 {speed} km/h，剩余 {lives} 次机会', '距離 {distance}/{target} 公尺，速度 {speed} km/h，剩餘 {lives} 次機會', '距離 {distance}/{target} m、速度 {speed} km/h、残機 {lives}', '거리 {distance}/{target} m, 속도 {speed} km/h, 남은 기회 {lives}', 'Distance {distance}/{target} m, vitesse {speed} km/h, {lives} vies', 'Strecke {distance}/{target} m, Tempo {speed} km/h, {lives} Leben', 'Distancia {distance}/{target} m, velocidad {speed} km/h, {lives} vidas', 'Distância {distance}/{target} m, velocidade {speed} km/h, {lives} vidas'],
  attack: ['Attack', '攻击', '攻擊', '攻撃', '공격', 'Attaquer', 'Angreifen', 'Atacar', 'Atacar'],
  dungeons: ['dungeons', '座地下城', '座地下城', 'ダンジョン', '던전', 'donjons', 'Dungeons', 'mazmorras', 'masmorras'],
  assetLoadFailed: ['Could not load game images', '游戏图片加载失败', '遊戲圖片載入失敗', 'ゲーム画像を読み込めません', '게임 이미지를 불러올 수 없습니다', 'Images du jeu indisponibles', 'Spielbilder konnten nicht geladen werden', 'No se pudieron cargar las imágenes', 'Não foi possível carregar as imagens'],
  adventureHelp: ['WASD / arrows: move · Space / J / click: attack · Drag: move · Find the key, defeat the guardian and take the stairs', 'WASD / 方向键移动 · 空格 / J / 点击攻击 · 拖动移动 · 拿钥匙、击败守卫后进入楼梯', 'WASD / 方向鍵移動 · 空白鍵 / J / 點擊攻擊 · 拖曳移動 · 拿鑰匙、擊敗守衛後進入樓梯', 'WASD / 方向キーで移動 · Space / J / クリックで攻撃 · ドラッグで移動 · 鍵を取り守護者を倒して階段へ', 'WASD / 방향키 이동 · Space / J / 클릭 공격 · 드래그 이동 · 열쇠를 찾고 수호자를 물리친 뒤 계단으로', 'WASD / flèches : déplacement · Espace / J / clic : attaque · Glisser : déplacement · Trouvez la clé, battez le gardien et prenez les escaliers', 'WASD / Pfeile: bewegen · Leertaste / J / Klick: angreifen · Ziehen: bewegen · Schlüssel finden, Wächter besiegen und Treppe erreichen', 'WASD / flechas: mover · Espacio / J / clic: atacar · Arrastrar: mover · Encuentra la llave, derrota al guardián y usa las escaleras', 'WASD / setas: mover · Espaço / J / clique: atacar · Arrastar: mover · Encontre a chave, vença o guardião e use a escada'],
  adventureBoard: ['Room {room}/9, health {health}/{max}, enemies {enemies}, {key}', '房间 {room}/9，生命 {health}/{max}，敌人 {enemies}，{key}', '房間 {room}/9，生命 {health}/{max}，敵人 {enemies}，{key}', '部屋 {room}/9、体力 {health}/{max}、敵 {enemies}、{key}', '방 {room}/9, 체력 {health}/{max}, 적 {enemies}, {key}', 'Salle {room}/9, santé {health}/{max}, ennemis {enemies}, {key}', 'Raum {room}/9, Leben {health}/{max}, Feinde {enemies}, {key}', 'Sala {room}/9, salud {health}/{max}, enemigos {enemies}, {key}', 'Sala {room}/9, vida {health}/{max}, inimigos {enemies}, {key}'],
  tetrisButton: ['Tetris', '方块', '方塊', 'テトリス', '테트리스', 'Tetris', 'Tetris', 'Tetris', 'Tetris'],
  fire: ['Fire', '射击', '射擊', '射撃', '발사', 'Tirer', 'Feuern', 'Disparar', 'Atirar'],
  forward: ['Forward', '前进', '前進', '前進', '전진', 'Avancer', 'Vorwärts', 'Avanzar', 'Avançar'],
  backward: ['Back', '后退', '後退', '後退', '후진', 'Reculer', 'Rückwärts', 'Retroceder', 'Recuar'],
  turnLeft: ['Turn left', '左转', '左轉', '左に旋回', '왼쪽 회전', 'Tourner à gauche', 'Links drehen', 'Girar a la izquierda', 'Virar à esquerda'],
  turnRight: ['Turn right', '右转', '右轉', '右に旋回', '오른쪽 회전', 'Tourner à droite', 'Rechts drehen', 'Girar a la derecha', 'Virar à direita'],
  'strafe-left': ['Strafe left', '向左平移', '向左平移', '左に平行移動', '왼쪽 이동', 'Pas à gauche', 'Seitwärts links', 'Desplazarse a la izquierda', 'Mover à esquerda'],
  'strafe-right': ['Strafe right', '向右平移', '向右平移', '右に平行移動', '오른쪽 이동', 'Pas à droite', 'Seitwärts rechts', 'Desplazarse a la derecha', 'Mover à direita'],
  sectors: ['sectors', '关', '關', 'ステージ', '구역', 'secteurs', 'Sektoren', 'sectores', 'setores'],
  fpsHelp: ["W/S move · A/D or ←/→ turn · Q/E strafe · Mouse / drag to look · Space / click to fire · Clear enemies, take the red key, reach the exit","W/S 前后移动 · A/D 或 ←/→ 转向 · Q/E 平移 · 鼠标移动 / 拖动转向 · 空格 / 点击射击 · 清敌、拿红钥匙后进入出口","W/S 前後移動 · A/D 或 ←/→ 轉向 · Q/E 平移 · 滑鼠移動 / 拖曳轉向 · 空白鍵 / 點擊射擊 · 清敵、拿紅鑰匙後進入出口","W/S 移動 · A/D・←/→ 旋回 · Q/E 横移動 · マウス・ドラッグで旋回 · Space・クリックで射撃 · 敵を倒し赤い鍵を取って出口へ","W/S 전후 이동 · A/D 또는 ←/→ 회전 · Q/E 옆 이동 · 마우스 / 드래그 회전 · Space / 클릭 발사 · 적을 처치하고 빨간 열쇠를 얻어 출구로 이동","W/S : avancer/reculer · A/D ou ←/→ : tourner · Q/E : pas latéral · Souris / glisser : viser · Espace / clic : tir · Éliminer les ennemis, prendre la clé rouge et sortir","W/S: bewegen · A/D oder ←/→: drehen · Q/E: seitwärts · Maus / Ziehen: umsehen · Leertaste / Klick: feuern · Gegner besiegen, roten Schlüssel holen und Ausgang erreichen","W/S: avanzar/retroceder · A/D o ←/→: girar · Q/E: desplazarse lateralmente · Ratón / arrastrar: mirar · Espacio / clic: disparar · Elimina enemigos, recoge la llave roja y llega a la salida","W/S: avançar/recuar · A/D ou ←/→: virar · Q/E: mover de lado · Mouse / arrastar: olhar · Espaço / clique: atirar · Elimine os inimigos, pegue a chave vermelha e alcance a saída"],
  fpsAmmo: ['AMMO', '弹药', '彈藥', '弾薬', '탄약', 'MUN.', 'MUN.', 'MUN.', 'MUN.'],
  fpsHealth: ['HEALTH', '生命', '生命', '体力', '체력', 'SANTÉ', 'LEBEN', 'SALUD', 'VIDA'],
  fpsArmor: ['ARMOR', '护甲', '護甲', '装甲', '방어', 'ARMURE', 'PANZER', 'ARMADURA', 'COLETE'],
  fpsEnemies: ['FOES', '敌人', '敵人', '敵', '적', 'ENN.', 'FEINDE', 'ENEM.', 'INIM.'],
  fpsKeyYes: ['key collected', '已拿钥匙', '已拿鑰匙', '鍵あり', '열쇠 있음', 'clé obtenue', 'Schlüssel erhalten', 'llave recogida', 'chave coletada'],
  fpsKeyNo: ['key missing', '未拿钥匙', '未拿鑰匙', '鍵なし', '열쇠 없음', 'clé manquante', 'Schlüssel fehlt', 'falta la llave', 'falta a chave'],
  fpsExitOpen: ['Exit unlocked', '出口已开启', '出口已開啟', '出口が開きました', '출구 열림', 'Sortie ouverte', 'Ausgang geöffnet', 'Salida abierta', 'Saída aberta'],
  fpsBoard: ['Sector {sector}/{total}, health {health}, ammo {ammo}, enemies {enemies}, {key}', '第 {sector}/{total} 关，生命 {health}，弹药 {ammo}，敌人 {enemies}，{key}', '第 {sector}/{total} 關，生命 {health}，彈藥 {ammo}，敵人 {enemies}，{key}', '{sector}/{total} ステージ、体力 {health}、弾薬 {ammo}、敵 {enemies}、{key}', '{sector}/{total} 구역, 체력 {health}, 탄약 {ammo}, 적 {enemies}, {key}', 'Secteur {sector}/{total}, santé {health}, munitions {ammo}, ennemis {enemies}, {key}', 'Sektor {sector}/{total}, Leben {health}, Munition {ammo}, Feinde {enemies}, {key}', 'Sector {sector}/{total}, salud {health}, munición {ammo}, enemigos {enemies}, {key}', 'Setor {sector}/{total}, vida {health}, munição {ammo}, inimigos {enemies}, {key}'],
  minesButton: ['Mines', '扫雷', '踩地雷', 'マイン', '지뢰찾기', 'Démineur', 'Minen', 'Minas', 'Minas'],
  breakoutButton: ['Breakout', '打砖块', '打磚塊', 'ブロック', '벽돌깨기', 'Briques', 'Breakout', 'Bloques', 'Blocos'],
  tetrisHelp: ['← → move · ↑ rotate · Space drop', '← → 移动 · ↑ 旋转 · 空格落下', '← → 移動 · ↑ 旋轉 · 空白鍵落下', '← → 移動 · ↑ 回転 · Space 落下', '← → 이동 · ↑ 회전 · Space 내려놓기', '← → déplacer · ↑ tourner · Espace lâcher', '← → bewegen · ↑ drehen · Leertaste ablegen', '← → mover · ↑ girar · Espacio soltar', '← → mover · ↑ girar · Espaço soltar'],
  mergeHelp: ['Arrow keys / swipe to merge', '方向键 / 滑动合并', '方向鍵 / 滑動合併', '方向キー / スワイプで合体', '방향키 / 밀어서 합치기', 'Flèches / glisser pour fusionner', 'Pfeiltasten / wischen zum Verbinden', 'Flechas / deslizar para combinar', 'Setas / deslizar para combinar'],
  minesHelp: ['Click to reveal · Right-click / F to flag', '点击翻格 · 右键 / F 插旗', '點擊翻格 · 右鍵 / F 插旗', 'クリックで開く · 右クリック / F で旗', '클릭하여 열기 · 우클릭 / F로 깃발', 'Clic pour révéler · Clic droit / F pour marquer', 'Klicken zum Aufdecken · Rechtsklick / F für Flagge', 'Clic para descubrir · Clic derecho / F para marcar', 'Clique para revelar · Botão direito / F para marcar'],
  breakoutHelp: ['Mouse / drag paddle · ← → move', '鼠标 / 拖动挡板 · ← → 移动', '滑鼠 / 拖曳擋板 · ← → 移動', 'マウス / ドラッグ · ← → 移動', '마우스 / 패들 드래그 · ← → 이동', 'Souris / glisser la raquette · ← → déplacer', 'Maus / Schläger ziehen · ← → bewegen', 'Ratón / arrastrar la pala · ← → mover', 'Mouse / arrastar a raquete · ← → mover'],
  left: ['Left', '左移', '左移', '左へ', '왼쪽', 'Gauche', 'Links', 'Izquierda', 'Esquerda'],
  right: ['Right', '右移', '右移', '右へ', '오른쪽', 'Droite', 'Rechts', 'Derecha', 'Direita'],
  up: ['Up', '上移', '上移', '上へ', '위로', 'Haut', 'Oben', 'Arriba', 'Cima'],
  down: ['Down', '下移', '下移', '下へ', '아래로', 'Bas', 'Unten', 'Abajo', 'Baixo'],
  rotate: ['Rotate', '旋转', '旋轉', '回転', '회전', 'Tourner', 'Drehen', 'Girar', 'Girar'],
  drop: ['Drop', '直接落下', '直接落下', '落下', '내려놓기', 'Lâcher', 'Ablegen', 'Soltar', 'Soltar'],
  flag: ['Toggle flag mode', '切换插旗模式', '切換插旗模式', '旗モード切替', '깃발 모드 전환', 'Mode drapeau', 'Flaggenmodus wechseln', 'Modo de banderas', 'Modo de bandeiras'],
  reveal: ['Reveal cell', '翻开格子', '翻開格子', 'マスを開く', '칸 열기', 'Révéler la case', 'Feld aufdecken', 'Descubrir casilla', 'Revelar célula'],
  restart: ['Restart', '重新开始', '重新開始', 'やり直す', '다시 시작', 'Recommencer', 'Neustart', 'Reiniciar', 'Reiniciar'],
  progress: ['Verification progress', '验证进度', '驗證進度', '認証の進捗', '인증 진행률', 'Progression', 'Fortschritt', 'Progreso', 'Progresso'],
  idle: ['Ready', '未开始', '未開始', '準備完了', '준비', 'Prêt', 'Bereit', 'Listo', 'Pronto'],
  running: ['Playing', '游戏进行中', '遊戲進行中', 'プレイ中', '플레이 중', 'Partie en cours', 'Spiel läuft', 'En juego', 'Em jogo'],
  paused: ['Paused', '已暂停', '已暫停', '一時停止中', '일시 정지', 'En pause', 'Pausiert', 'En pausa', 'Em pausa'],
  passed: ['Verified', '验证通过', '驗證通過', '認証完了', '인증 완료', 'Vérifié', 'Verifiziert', 'Verificado', 'Verificado'],
  failed: ['Game over', '游戏结束', '遊戲結束', 'ゲーム終了', '게임 종료', 'Partie terminée', 'Spiel vorbei', 'Fin del juego', 'Fim de jogo'],
  start: ['Start', '开始', '開始', '開始', '시작', 'Jouer', 'Start', 'Jugar', 'Jogar'],
  resume: ['Resume', '继续', '繼續', '再開', '계속', 'Reprendre', 'Fortsetzen', 'Continuar', 'Continuar'],
  retry: ['Retry', '重试', '重試', '再挑戦', '다시 시도', 'Réessayer', 'Erneut versuchen', 'Reintentar', 'Tentar novamente'],
  stackFull: ['Stack full', '方块已满', '方塊已滿', 'ブロックが一杯です', '블록이 가득 찼습니다', 'Grille pleine', 'Spielfeld voll', 'Tablero lleno', 'Tabuleiro cheio'],
  noMoves: ['No moves left', '没有可移动的方块', '沒有可移動的方塊', '動かせるマスがありません', '더 이상 움직일 수 없습니다', 'Plus de mouvements', 'Keine Züge mehr', 'No quedan movimientos', 'Sem movimentos'],
  hitMine: ['Hit a mine', '踩到地雷', '踩到地雷', '地雷を踏みました', '지뢰를 밟았습니다', 'Mine touchée', 'Mine getroffen', 'Has pisado una mina', 'Você atingiu uma mina'],
  noLives: ['No lives left', '次数用尽', '次數用盡', '残機がありません', '기회를 모두 사용했습니다', 'Plus de vies', 'Keine Leben mehr', 'No quedan vidas', 'Sem vidas'],
  livesLeft: ['Lives: {n}', '还剩 {n} 次机会', '還剩 {n} 次機會', '残機：{n}', '남은 기회: {n}', 'Vies : {n}', 'Leben: {n}', 'Vidas: {n}', 'Vidas: {n}'],
  boardTetris: ['Tetris: {lines} lines, column {col}, row {row}', '俄罗斯方块，已消除 {lines} 行，第 {col} 列第 {row} 行', '俄羅斯方塊，已消除 {lines} 行，第 {col} 欄第 {row} 列', 'テトリス：{lines} ライン、{col} 列 {row} 行', '테트리스: {lines}줄 제거, {col}열 {row}행', 'Tetris : {lines} lignes, colonne {col}, ligne {row}', 'Tetris: {lines} Reihen, Spalte {col}, Reihe {row}', 'Tetris: {lines} líneas, columna {col}, fila {row}', 'Tetris: {lines} linhas, coluna {col}, linha {row}'],
  board2048: ['2048 board: {cells}', '2048 棋盘：{cells}', '2048 棋盤：{cells}', '2048 盤面：{cells}', '2048 보드: {cells}', 'Grille 2048 : {cells}', '2048-Feld: {cells}', 'Tablero 2048: {cells}', 'Tabuleiro 2048: {cells}'],
  empty: ['empty', '空', '空', '空', '빈칸', 'vide', 'leer', 'vacío', 'vazio'],
  boardMines: ['Minesweeper, 8 columns, 6 rows', '扫雷棋盘，8 列 6 行', '踩地雷棋盤，8 欄 6 列', 'マインスイーパ、8 列 6 行', '지뢰찾기, 8열 6행', 'Démineur, 8 colonnes, 6 lignes', 'Minenfeld, 8 Spalten, 6 Reihen', 'Buscaminas, 8 columnas, 6 filas', 'Campo minado, 8 colunas, 6 linhas'],
  cell: ['Row {row}, column {col}: {value}', '第 {row} 行第 {col} 列，{value}', '第 {row} 列第 {col} 欄，{value}', '{row} 行 {col} 列：{value}', '{row}행 {col}열: {value}', 'Ligne {row}, colonne {col} : {value}', 'Reihe {row}, Spalte {col}: {value}', 'Fila {row}, columna {col}: {value}', 'Linha {row}, coluna {col}: {value}'],
  mine: ['mine', '地雷', '地雷', '地雷', '지뢰', 'mine', 'Mine', 'mina', 'mina'],
  flagged: ['flagged', '已插旗', '已插旗', '旗あり', '깃발 있음', 'marquée', 'markiert', 'marcada', 'marcada'],
  closed: ['hidden', '未翻开', '未翻開', '未開封', '닫힘', 'cachée', 'verdeckt', 'oculta', 'oculta'],
  adjacent: ['{n} adjacent mines', '{n} 个相邻雷', '{n} 個相鄰雷', '隣接地雷 {n} 個', '인접 지뢰 {n}개', '{n} mines voisines', '{n} benachbarte Minen', '{n} minas adyacentes', '{n} minas adjacentes'],
  flagOn: ['Flag mode', '插旗模式', '插旗模式', '旗モード', '깃발 모드', 'Mode drapeau', 'Flaggenmodus', 'Modo de banderas', 'Modo de bandeiras'],
  flagOff: ['Reveal mode', '翻格模式', '翻格模式', '開くモード', '칸 열기 모드', 'Mode révélation', 'Aufdeckmodus', 'Modo de descubrir', 'Modo de revelar'],
  boardBreakout: ['Breakout: {lives} lives, {bricks} bricks', '打砖块，{lives} 次机会，剩余 {bricks} 块砖', '打磚塊，{lives} 次機會，剩餘 {bricks} 塊磚', 'ブロック崩し：残機 {lives}、ブロック {bricks}', '벽돌깨기: 기회 {lives}, 남은 벽돌 {bricks}', 'Casse-briques : {lives} vies, {bricks} briques', 'Breakout: {lives} Leben, {bricks} Steine', 'Rompebloques: {lives} vidas, {bricks} bloques', 'Quebra-blocos: {lives} vidas, {bricks} blocos'],
  demo: ['Demo', '在线演示', '線上展示', 'デモ', '데모', 'Démo', 'Demo', 'Demo', 'Demo'],
  game: ['Game', '游戏', '遊戲', 'ゲーム', '게임', 'Jeu', 'Spiel', 'Juego', 'Jogo'],
  target: ['Target', '目标', '目標', '目標', '목표', 'Objectif', 'Ziel', 'Meta', 'Meta'],
  restore: ['Reset target', '恢复默认目标', '恢復預設目標', '目標を初期化', '기본 목표 복원', 'Rétablir la cible', 'Ziel zurücksetzen', 'Restablecer meta', 'Restaurar meta'],
  random: ['Random', '随机', '隨機', 'ランダム', '무작위', 'Aléatoire', 'Zufällig', 'Aleatorio', 'Aleatório'],
  default: ['Default', '默认', '預設', '既定', '기본값', 'Défaut', 'Standard', 'Predeterminado', 'Padrão'],
  enter: ['Enter', '进入页面', '進入頁面', '進む', '입장', 'Entrer', 'Weiter', 'Entrar', 'Entrar'],
  code: ['Integration code', '接入代码', '整合程式碼', '導入コード', '연동 코드', 'Code d’intégration', 'Einbindungscode', 'Código de integración', 'Código de integração'],
  aiPrompt: ['AI prompt', 'AI 提示词', 'AI 提示詞', 'AI プロンプト', 'AI 프롬프트', 'Prompt IA', 'KI-Prompt', 'Prompt IA', 'Prompt IA'],
  copy: ['Copy', '复制', '複製', 'コピー', '복사', 'Copier', 'Kopieren', 'Copiar', 'Copiar'],
  copied: ['Copied', '已复制', '已複製', 'コピー済み', '복사됨', 'Copié', 'Kopiert', 'Copiado', 'Copiado'],
  copySelection: ['Copy selection', '请复制选中文本', '請複製選取文字', '選択部分をコピー', '선택한 텍스트 복사', 'Copier la sélection', 'Auswahl kopieren', 'Copiar selección', 'Copiar seleção'],
  api: ['API', 'API 参数', 'API 參數', 'API', 'API', 'API', 'API', 'API', 'API'],
  gameOption: ['Game ID; defaults to tetris. Accepts random.', '游戏 ID；默认 tetris，支持 random。', '遊戲 ID；預設 tetris，支援 random。', 'ゲーム ID。既定は tetris。random に対応。', '게임 ID. 기본값은 tetris. random 지원.', 'ID du jeu ; tetris par défaut. Accepte random.', 'Spiel-ID; Standard: tetris. Unterstützt random.', 'ID del juego; tetris por defecto. Admite random.', 'ID do jogo; padrão: tetris. Aceita random.'],
  targetOption: ['Score required; defaults to each game’s target.', '通关目标；不填则使用各游戏默认值。', '通關目標；未填則使用各遊戲預設值。', 'クリア目標。省略時はゲームの既定値。', '통과 목표. 생략하면 게임별 기본값 사용.', 'Score requis ; cible du jeu par défaut.', 'Benötigte Punkte; sonst Standard des Spiels.', 'Puntos necesarios; por defecto, la meta del juego.', 'Pontuação necessária; usa a meta padrão do jogo.'],
  verifyOption: ['On success: game, score, target and elapsed time.', '通关回调，返回游戏、得分、目标和耗时。', '通關回呼，回傳遊戲、得分、目標和耗時。', '成功時にゲーム、得点、目標、経過時間を返します。', '성공 시 게임, 점수, 목표, 소요 시간을 반환합니다.', 'En cas de succès : jeu, score, cible et durée.', 'Bei Erfolg: Spiel, Punkte, Ziel und Dauer.', 'Al completar: juego, puntos, meta y duración.', 'Ao concluir: jogo, pontos, meta e duração.'],
  stateOption: ['State callback; revoke access after a restart.', '状态变化回调；重试时撤销上次的通行状态。', '狀態變化回呼；重試時撤銷上次的通行狀態。', '状態変更時の処理。再開時に認証を解除します。', '상태 변경 콜백. 재시작 시 이전 인증 취소.', 'Changement d’état ; révoquer l’accès au redémarrage.', 'Statusänderung; Zugang nach Neustart widerrufen.', 'Cambio de estado; revocar acceso al reiniciar.', 'Mudança de estado; revogar acesso ao reiniciar.'],
  destroyOption: ['Clean up when unmounting.', '页面卸载时清理组件。', '頁面卸載時清理元件。', 'ページ終了時に解放します。', '페이지 종료 시 정리합니다.', 'Nettoyer au démontage.', 'Beim Entfernen aufräumen.', 'Limpiar al desmontar.', 'Limpar ao desmontar.'],
  localeOption: ['Browser language by default; accepts a language tag.', '默认匹配浏览器语言，可传入语言标签。', '預設符合瀏覽器語言，可傳入語言標籤。', '既定はブラウザーの言語。言語タグで指定可能。', '기본값은 브라우저 언어. 언어 태그로 지정 가능.', 'Langue du navigateur par défaut ; code de langue accepté.', 'Standard: Browsersprache. Sprachcode möglich.', 'Idioma del navegador por defecto; admite etiqueta de idioma.', 'Idioma do navegador por padrão; aceita código de idioma.'],
  defaults: ['Defaults: Tetris 500 / 2048 128 / Mines and Breakout: clear board / FPS: 5 sectors / Adventure: 1 dungeon / Racing: 1500 m.', '默认目标：方块 500 / 2048 128 / 扫雷、打砖块清屏 / FPS 5 关 / 冒险 1 座地下城 / 赛车 1500 米。', '預設目標：方塊 500 / 2048 128 / 踩地雷、打磚塊清空棋盤 / FPS 5 關 / 冒險 1 座地下城 / 賽車 1500 公尺。', '既定目標：テトリス 500 / 2048 128 / 地雷・ブロックは全クリア / FPS 5 ステージ / 冒険 1 ダンジョン / レース 1500 m。', '기본 목표: 테트리스 500 / 2048 128 / 지뢰·벽돌 모두 제거 / FPS 5 구역 / 모험 던전 1개 / 레이싱 1500 m.', 'Cibles : Tetris 500 / 2048 128 / Démineur et Briques : vider la grille / FPS : 5 secteurs / Aventure : 1 donjon / Course : 1500 m.', 'Ziele: Tetris 500 / 2048 128 / Minen und Breakout: Spielfeld räumen / FPS: 5 Sektoren / Abenteuer: 1 Verlies / Rennen: 1500 m.', 'Metas: Tetris 500 / 2048 128 / Minas y Bloques: completar tablero / FPS: 5 sectores / Aventura: 1 mazmorra / Carreras: 1500 m.', 'Metas: Tetris 500 / 2048 128 / Minas e Blocos: limpar tabuleiro / FPS: 5 setores / Aventura: 1 masmorra / Corrida: 1500 m.'],
  buildHelp: ['Run {command}, then serve lib/ with your site.', '运行 {command}，将 lib/ 放入网站目录。', '執行 {command}，將 lib/ 放入網站目錄。', '{command} を実行し、lib/ をサイトに配置します。', '{command} 실행 후 lib/를 웹사이트에 배치합니다.', 'Exécuter {command}, puis servir lib/ avec le site.', '{command} ausführen, dann lib/ im Website-Verzeichnis bereitstellen.', 'Ejecuta {command} y sirve lib/ con tu sitio.', 'Execute {command} e sirva lib/ com seu site.'],
  example: ['Full example', '完整示例', '完整範例', '実装例', '전체 예제', 'Exemple complet', 'Vollständiges Beispiel', 'Ejemplo completo', 'Exemplo completo'],
  entered: ['You’re in', '已进入页面', '已進入頁面', '入場しました', '입장 완료', 'Accès ouvert', 'Zugang gewährt', 'Acceso concedido', 'Acesso liberado'],
  back: ['Back to demo', '返回测试', '返回測試', 'デモに戻る', '테스트로 돌아가기', 'Retour à la démo', 'Zurück zur Demo', 'Volver a la demo', 'Voltar à demo'],
  range: ['Target: 1–{max}.', '目标范围：1–{max}。', '目標範圍：1–{max}。', '目標範囲：1–{max}。', '목표 범위: 1–{max}.', 'Cible : 1–{max}.', 'Ziel: 1–{max}.', 'Meta: 1–{max}.', 'Meta: 1–{max}.'],
  cleanup: ['Call gate.destroy() when unmounting.', '页面卸载时调用 gate.destroy()。', '頁面卸載時呼叫 gate.destroy()。', 'ページ終了時に gate.destroy() を呼び出します。', '페이지 종료 시 gate.destroy() 호출.', 'Appeler gate.destroy() au démontage.', 'Beim Entfernen gate.destroy() aufrufen.', 'Llama a gate.destroy() al desmontar.', 'Chame gate.destroy() ao desmontar.'],
  unknownGame: ['Unknown game: {id}', '未注册的游戏：{id}', '未註冊的遊戲：{id}', '未登録のゲーム：{id}', '등록되지 않은 게임: {id}', 'Jeu inconnu : {id}', 'Unbekanntes Spiel: {id}', 'Juego desconocido: {id}', 'Jogo desconhecido: {id}'],
  invalidTarget: ['{game}: target must be an integer from 1 to {max}.', '{game}的目标应为 1–{max} 的整数。', '{game}的目標應為 1–{max} 的整數。', '{game}：目標は 1–{max} の整数です。', '{game}: 목표는 1–{max} 정수여야 합니다.', '{game} : la cible doit être un entier de 1 à {max}.', '{game}: Ziel muss eine ganze Zahl von 1 bis {max} sein.', '{game}: la meta debe ser un entero de 1 a {max}.', '{game}: a meta deve ser um inteiro de 1 a {max}.'],
  containerMissing: ['Container not found: {id}', '找不到验证码容器：{id}', '找不到驗證碼容器：{id}', 'コンテナがありません：{id}', '컨테이너를 찾을 수 없습니다: {id}', 'Conteneur introuvable : {id}', 'Container nicht gefunden: {id}', 'Contenedor no encontrado: {id}', 'Contêiner não encontrado: {id}'],
  points: ['points', '分', '分', '点', '점', 'points', 'Punkte', 'puntos', 'pontos'],
  cells: ['cells', '格', '格', 'マス', '칸', 'cases', 'Felder', 'casillas', 'células'],
} as const satisfies Record<string, readonly [string, string, string, string, string, string, string, string, string]>;

export type MessageKey = keyof typeof messages;
export type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

function matchLocale(language: string): Locale | undefined {
  const tag = language.replace(/_/g, '-').toLowerCase();
  const [base] = tag.split('-');
  if (base === 'zh') {
    if (tag.includes('-hant')) return 'zh-TW';
    if (tag.includes('-hans')) return 'zh-CN';
    return /-(tw|hk|mo)(-|$)/.test(tag) ? 'zh-TW' : 'zh-CN';
  }
  return locales.find(locale => locale === base);
}

export function resolveLocale(locale: LocaleOption = 'auto', languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages?.length ? navigator.languages : [navigator.language]): Locale {
  if (locale !== 'auto') return matchLocale(locale) ?? 'en';
  for (const language of languages) { const match = matchLocale(language); if (match) return match; }
  return 'en';
}

export function createTranslator(locale: LocaleOption = 'auto'): Translator {
  const column = locales.indexOf(resolveLocale(locale));
  return (key, values = {}) => messages[key][column].replace(/\{(\w+)\}/g, (token, name: string) => String(values[name] ?? token));
}

export function localizeGame(game: GameDefinition, locale: LocaleOption): GameDefinition {
  const help = { tetris: 'tetrisHelp', '2048': 'mergeHelp', minesweeper: 'minesHelp', breakout: 'breakoutHelp', fps: 'fpsHelp', adventure: 'adventureHelp', racing: 'racingHelp' } as const;
  if (!Object.hasOwn(help, game.id)) return game;
  const id = game.id as keyof typeof help;
  const t = createTranslator(locale);
  const directions = { up: 'forward', down: 'backward', left: 'turnLeft', right: 'turnRight' } as const;
  return { ...game, name: t(id), description: t(id), instructions: t(help[id]), scoreUnit: t(id === 'minesweeper' ? 'cells' : id === 'fps' ? 'sectors' : id === 'adventure' ? 'dungeons' : id === 'racing' ? 'meters' : 'points'), controls: game.controls.map(control => ({ ...control, label: t(id === 'fps' && control.action in directions ? directions[control.action as keyof typeof directions] : control.action) })) };
}
