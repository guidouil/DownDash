// main.js

// Scène de préchargement
class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload() {
    // Charger les images nécessaires
    this.load.image("background", "assets/background.png");
    this.load.image("player", "assets/player.png");

    // Charger Font Awesome via CDN
    const fontAwesomeLink = document.createElement("link");
    fontAwesomeLink.href =
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
    fontAwesomeLink.rel = "stylesheet";
    document.head.appendChild(fontAwesomeLink);

    // Chargement du son de game over uniquement
    this.load.audio("game-over", "assets/sounds/game-over.mp3");
  }

  create() {
    // Démarrer la scène du jeu
    this.scene.start("GameScene");
  }
}

// Scène principale du jeu
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.highScore = localStorage.getItem("highScore") || 0;
    this.difficultyMultiplier = 1.5;
    this.obstacleSpeed = 300;
    this.obstacleFrequency = 150;
    this.backgroundSpeed = 5;
    this.isGameOver = false;
  }

  create() {
    this.isGameOver = false;
    const width = this.scale.width;
    const height = this.scale.height;

    this.cameras.main.setZoom(2);
    this.cameras.main.centerOn(width / 2, height / 2);

    // Fond
    this.background = this.add.tileSprite(0, 0, width, height, "background");
    this.background.setOrigin(0, 0);
    this.background.setScale(2);

    // Score et High Score
    this.score = 0;
    this.scoreText = this.add
      .text(20, 20, "Score: 0", {
        fontSize: "24px",
        fill: "#fff",
      })
      .setScrollFactor(0)
      .setDepth(1);

    this.highScoreText = this.add
      .text(20, 50, "High Score: " + this.highScore, {
        fontSize: "24px",
        fill: "#fff",
      })
      .setScrollFactor(0)
      .setDepth(1);

    // Ajuster la taille des emojis
    this.emojiSize = 60;

    // Variables de contrôle
    this.isMobile =
      this.sys.game.device.os.android || this.sys.game.device.os.iOS;

    // Créer la texture du canard
    this.createDuckTexture();

    // Remplacer le sprite du joueur par le canard
    this.player = this.physics.add.sprite(
      this.scale.width / 2,
      this.scale.height * 0.7,
      "duck_player"
    );
    this.player.setCollideWorldBounds(true);

    // Créer la box pointillée avec une profondeur appropriée
    this.playerBox = this.add.graphics();
    this.playerBox.setDepth(1); // S'assurer que la box est au-dessus du fond
    this.drawPlayerBox("#ffffff");

    // Augmenter la vitesse du joueur
    this.playerSpeed = 800;

    // Variables pour les contrôles tactiles
    this.touchX = null;

    // Créer un groupe simple pour les obstacles
    this.obstacles = this.add.group();

    // Timer de spawn
    this.time.addEvent({
      delay: this.obstacleFrequency,
      callback: () => this.spawnObstacle(),
      callbackScope: this,
      loop: true,
    });

    // Contrôles au clavier
    this.cursors = this.input.keyboard.createCursorKeys();

    // Contrôles tactiles
    this.input.on("pointerdown", this.touchStart, this);
    this.input.on("pointermove", this.touchMove, this);

    // Contrôles au gyroscope
    if (this.isMobile) {
      this.setupSlideControls();
    }

    // Activer le debug des physics
    // this.physics.world.createDebugGraphic();
    // this.physics.world.debugGraphic.visible = true;

    // Ajuster la vitesse pour mobile
    if (this.sys.game.device.os.android || this.sys.game.device.os.iOS) {
      // Vitesses augmentées pour mobile
      this.backgroundSpeed = 8; // Vitesse de base plus élevée
      this.obstacleSpeed = 400; // Vitesse des obstacles plus élevée

      this.setupSlideControls();
    }
    // Position normale sur desktop et mobile
    this.player.y = this.scale.height * 0.6;

    // Garder uniquement le son de game over
    this.gameOverSound = this.sound.add("game-over", {
      volume: 0.7,
    });
  }

  update() {
    if (!this.isGameOver) {
      // Vitesse du fond ajustée pour mobile
      if (this.sys.game.device.os.android || this.sys.game.device.os.iOS) {
        this.background.tilePositionY += this.backgroundSpeed;

        if (!this.physics.world.isPaused) {
          this.backgroundSpeed = 8 + this.difficultyMultiplier * 0.8; // Progression plus rapide
          this.score += 0.15 * this.difficultyMultiplier; // Score augmente plus vite
          this.scoreText.setText("Score: " + Math.floor(this.score));
        }
      } else {
        // Vitesse normale sur desktop
        this.background.tilePositionY += this.backgroundSpeed;

        if (!this.physics.world.isPaused) {
          this.backgroundSpeed = 5 + this.difficultyMultiplier * 0.5;
          this.score += 0.1 * this.difficultyMultiplier;
          this.scoreText.setText("Score: " + Math.floor(this.score));
        }
      }

      // Mettre à jour la position de la box
      this.drawPlayerBox("#ffffff");
    }

    // Nettoyer les obstacles
    this.obstacles.getChildren().forEach((obstacle) => {
      // Détruire les obstacles qui sont sortis de l'écran
      if (obstacle.y > this.scale.height + 50) {
        obstacle.destroy();
      }
    });

    // Contrôles du joueur
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-400);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(400);
    } else {
      this.player.setVelocityX(0);
    }
  }

  spawnObstacle() {
    const width = this.scale.width;
    const obstacleCount = Math.min(8, Math.ceil(this.difficultyMultiplier));

    for (let i = 0; i < obstacleCount; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const obstacle = this.physics.add.sprite(
        x,
        -50,
        this.createCharTexture(this.getRandomEmoji())
      );

      obstacle.body.setSize(this.emojiSize - 10, this.emojiSize - 10);
      obstacle.body.setOffset(5, 5);
      obstacle.body.allowGravity = false;

      obstacle.setVelocity(
        Phaser.Math.Between(-150, 150),
        this.obstacleSpeed * this.difficultyMultiplier
      );

      this.obstacles.add(obstacle);
      this.physics.add.collider(
        obstacle,
        this.player,
        () => this.gameOver(),
        null,
        this
      );
      obstacle.setAngularVelocity(Phaser.Math.Between(-150, 150));
    }
  }

  getRandomEmoji() {
    // Liste d'emojis dangereux/obstacles
    const emojis = [
      "💣",
      "⚡️",
      "🔥",
      "☄️",
      "🌪️",
      "🍖",
      "🐍",
      "🦈",
      "🐊",
      "👻",
      "💀",
      "👾",
      "🤖",
      "🎃",
      "⚔️",
      "🗡️",
      "💥",
      "🍌",
    ];
    return emojis[Phaser.Math.Between(0, emojis.length - 1)];
  }

  createCharTexture(emoji) {
    let key = "emoji_" + emoji;

    if (this.textures.exists(key)) {
      return key;
    }

    let canvas = document.createElement("canvas");
    canvas.width = this.emojiSize;
    canvas.height = this.emojiSize;
    let ctx = canvas.getContext("2d");

    // Cadre rouge
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, this.emojiSize - 4, this.emojiSize - 4);

    // Emoji plus grand
    ctx.font = "45px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, this.emojiSize / 2, this.emojiSize / 2);

    this.textures.addCanvas(key, canvas);
    return key;
  }

  touchStart(pointer) {
    // Enregistrer la position initiale du toucher
    this.touchX = pointer.x;
  }

  touchMove(pointer) {
    if (this.touchX === null) return;

    let deltaX = pointer.x - this.touchX;

    // Se déplacer en fonction du glissement
    if (deltaX > 10) {
      this.player.setVelocityX(200);
    } else if (deltaX < -10) {
      this.player.setVelocityX(-200);
    } else {
      this.player.setVelocityX(0);
    }
  }

  setupSlideControls() {
    // Supprimer les anciens listeners s'ils existent
    this.input.off("pointerdown");
    this.input.off("pointermove");
    this.input.off("pointerup");

    // Nouveaux contrôles slide améliorés
    this.input.on("pointerdown", (pointer) => {
      this.touchStartX = pointer.x;
      this.lastX = this.player.x;
    });

    this.input.on("pointermove", (pointer) => {
      if (this.touchStartX !== null && !this.isGameOver) {
        const deltaX = pointer.x - this.touchStartX;
        const newX = this.lastX + deltaX;

        // Mouvement plus fluide avec limites
        const targetX = Phaser.Math.Clamp(
          newX,
          50, // Limite gauche
          this.scale.width - 50 // Limite droite
        );

        this.player.x = targetX;
      }
    });

    this.input.on("pointerup", () => {
      this.touchStartX = null;
    });
  }

  gameOver() {
    this.isGameOver = true;
    this.physics.pause();
    this.player.setTint(0xff0000);
    this.drawPlayerBox("#ff0000"); // Box rouge au game over

    // Arrêter toutes les rotations des obstacles
    this.obstacles.getChildren().forEach((obstacle) => {
      obstacle.setAngularVelocity(0);
    });

    // Mise à jour du high score
    if (Math.floor(this.score) > this.highScore) {
      this.highScore = Math.floor(this.score);
      localStorage.setItem("highScore", this.highScore);
      this.highScoreText.setText("High Score: " + this.highScore);
    }

    // Menu Game Over
    const width = this.scale.width;
    const height = this.scale.height;

    const overlay = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.6)
      .setScrollFactor(0)
      .setDepth(2);
    overlay.setOrigin(0, 0);

    // Textes ajustés pour le zoom
    this.add
      .text(width / 2, height / 2, "Game Over", {
        fontSize: "32px",
        fill: "#fff",
        fontWeight: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2);

    this.add
      .text(width / 2, height / 1.7 + 70, "Score: " + Math.floor(this.score), {
        fontSize: "24px",
        fill: "#fff",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2);

    this.add
      .text(width / 2, height / 1.7 + 100, "High Score: " + this.highScore, {
        fontSize: "26px",
        fill: "gold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2);

    // Bouton Restart
    const restartButton = this.add
      .rectangle(width / 2, height / 1.7 + 180, 200, 50, 0x00ff00)
      .setScrollFactor(0)
      .setDepth(2);

    const restartText = this.add
      .text(width / 2, height / 1.7 + 180, "RESTART", {
        fontSize: "24px",
        fill: "#000",
        fontWeight: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2);

    restartButton.setInteractive();
    restartButton.on("pointerover", () => {
      restartButton.setFillStyle(0x00dd00);
      this.game.canvas.style.cursor = "pointer";
    });

    restartButton.on("pointerout", () => {
      restartButton.setFillStyle(0x00ff00);
      this.game.canvas.style.cursor = "default";
    });

    restartButton.on("pointerdown", () => {
      this.game.canvas.style.cursor = "default";
      this.restartGame();
    });

    // Animation du bouton
    this.tweens.add({
      targets: [restartButton, restartText],
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Garder le son de game over
    this.gameOverSound.play();
  }

  increaseDifficulty() {
    this.difficultyMultiplier += 0.4;
    this.obstacleFrequency = Math.max(300, this.obstacleFrequency - 100);
    this.obstacleSpeed = Math.min(1000, this.obstacleSpeed + 50);
    // La vitesse du fond augmentera automatiquement avec le multiplicateur
  }

  drawPlayerBox(color) {
    this.playerBox.clear();
    this.playerBox.lineStyle(2, color === "#ffffff" ? 0xffffff : 0xff0000, 1);

    // Créer une ligne pointillée
    const boxWidth = 60;
    const boxHeight = 60;
    const dashLength = 5;
    const gapLength = 5;

    // Position relative au joueur (centré sur le joueur)
    const x = this.player.x - boxWidth / 2;
    const y = this.player.y - boxHeight / 2;

    // Dessiner les lignes pointillées
    let currentX = 0;
    let currentY = 0;

    // Ligne du haut
    for (
      currentX = 0;
      currentX < boxWidth;
      currentX += dashLength + gapLength
    ) {
      this.playerBox.moveTo(x + currentX, y);
      this.playerBox.lineTo(x + Math.min(currentX + dashLength, boxWidth), y);
    }

    // Ligne du bas
    for (
      currentX = 0;
      currentX < boxWidth;
      currentX += dashLength + gapLength
    ) {
      this.playerBox.moveTo(x + currentX, y + boxHeight);
      this.playerBox.lineTo(
        x + Math.min(currentX + dashLength, boxWidth),
        y + boxHeight
      );
    }

    // Ligne gauche
    for (
      currentY = 0;
      currentY < boxHeight;
      currentY += dashLength + gapLength
    ) {
      this.playerBox.moveTo(x, y + currentY);
      this.playerBox.lineTo(x, y + Math.min(currentY + dashLength, boxHeight));
    }

    // Ligne droite
    for (
      currentY = 0;
      currentY < boxHeight;
      currentY += dashLength + gapLength
    ) {
      this.playerBox.moveTo(x + boxWidth, y + currentY);
      this.playerBox.lineTo(
        x + boxWidth,
        y + Math.min(currentY + dashLength, boxHeight)
      );
    }

    // Mettre à jour la profondeur pour être sûr que la box est visible
    this.playerBox.setDepth(1);
  }

  // Optionnel : Faire clignoter la box au game over
  createBlinkingEffect() {
    if (this.isGameOver) {
      this.time.addEvent({
        delay: 200,
        callback: () => {
          this.playerBox.visible = !this.playerBox.visible;
        },
        loop: true,
      });
    }
  }

  // Modifier la méthode restart pour relancer la musique
  restartGame() {
    this.scene.restart();
  }

  createDuckTexture() {
    const key = "duck_player";
    const size = 60; // Même taille que les obstacles

    // Créer un canvas pour le canard
    let canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    let ctx = canvas.getContext("2d");

    // Dessiner le cadre blanc
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, size - 4, size - 4);

    // Dessiner le canard emoji
    ctx.font = "45px Arial"; // Grande taille pour l'emoji
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🦆", size / 2, size / 2);

    // Ajouter la texture au jeu
    this.textures.addCanvas(key, canvas);
  }
}

// Configuration du jeu
const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: "game-container",
    width: "100%",
    height: "100%",
    min: {
      width: 300,
      height: 450,
    },
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [PreloadScene, GameScene],
};

// Création de l'instance du jeu
const game = new Phaser.Game(config);
