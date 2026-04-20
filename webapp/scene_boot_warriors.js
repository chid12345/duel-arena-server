/* ============================================================
   BootScene — ext: _generateWarriorTextures
   4 типа воинов: tank(Берсерк), agile(Теневой Вихрь),
                  crit(Хаос-Рыцарь), neutral(Легионер)
   ============================================================ */

Object.assign(BootScene.prototype, {

  _generateWarriorTextures() {
    this._wtDraw('warrior_tank',    0xcc2222, 0x881111, 'tank');
    this._wtDraw('warrior_agile',   0x0d3a1a, 0x062010, 'agile');
    this._wtDraw('warrior_crit',    0x2d0a4a, 0x1a0030, 'crit');
    this._wtDraw('warrior_neutral', 0x3a6644, 0x1a3a22, 'neutral');
    this._wtFace('warrior_tank_face',    0xcc2222, 'tank');
    this._wtFace('warrior_agile_face',   0x0d3a1a, 'agile');
    this._wtFace('warrior_crit_face',    0x2d0a4a, 'crit');
    this._wtFace('warrior_neutral_face', 0x3a6644, 'neutral');
  },

  _wtDraw(key, bc, sc, type) {
    if (this.textures.exists(key)) return; // PNG already loaded — skip pixel-art generation
    const rt = this.add.renderTexture(0, 0, 80, 120).setVisible(false);
    const g  = this.add.graphics().setVisible(false);

    g.fillStyle(sc, 0.3); g.fillEllipse(40, 110, 50, 12); // тень

    if (type === 'tank') {
      // === БЕРСЕРК: широкое тело, нет щита, топор, рогатый шлем ===
      g.fillStyle(bc, 1);
      g.fillRect(26, 80, 12, 32); g.fillRect(42, 80, 12, 32);    // ноги
      g.fillRoundedRect(20, 40, 40, 42, 8);                       // широкий торс
      g.fillStyle(sc, 1); g.fillRoundedRect(24, 44, 32, 18, 5);   // броня
      g.fillStyle(bc, 1); g.fillCircle(40, 26, 16);               // голова
      g.fillStyle(sc, 1); g.fillRect(24, 13, 32, 10);             // шлем
      g.fillStyle(0xcc9933, 1);                                    // рога (золото)
      g.fillTriangle(27, 13, 20, 1, 14, 13);
      g.fillTriangle(53, 13, 60, 13, 66, 1);
      g.fillStyle(0xff2200, 1); g.fillCircle(34, 26, 4); g.fillCircle(46, 26, 4); // глаза
      g.fillStyle(0xff8800, 1); g.fillCircle(35, 26, 2); g.fillCircle(47, 26, 2);
      g.lineStyle(4, 0x886633, 1); g.lineBetween(60, 54, 77, 22); // рукоять топора
      g.fillStyle(0xaabbcc, 1); g.fillTriangle(72, 18, 80, 10, 80, 32); // лезвие
      g.lineStyle(1.5, 0xddeeff, 1); g.lineBetween(75, 13, 79, 29);     // блик
      g.fillStyle(bc, 1); g.fillCircle(60, 54, 6);                       // кулак

    } else if (type === 'agile') {
      // === ТЕНЕВОЙ ВИХРЬ: тонкий, капюшон, маска, 2 клинка ===
      g.fillStyle(bc, 1);
      g.fillRect(33, 80, 10, 34); g.fillRect(45, 80, 10, 34);    // тонкие ноги
      g.fillRoundedRect(29, 43, 22, 38, 7);                       // тонкий торс
      g.fillStyle(sc, 1);                                          // плащ-крылья
      g.fillTriangle(29, 47, 12, 108, 29, 92);
      g.fillTriangle(51, 47, 68, 108, 51, 92);
      g.lineStyle(1.5, 0x00cc55, 0.8);                             // перекрёстный ремень
      g.lineBetween(29, 49, 51, 63); g.lineBetween(51, 49, 29, 63);
      g.fillStyle(bc, 1); g.fillCircle(40, 28, 14);               // голова
      g.fillStyle(sc, 1);                                          // капюшон
      g.fillTriangle(26, 18, 40, 28, 54, 18);
      g.fillTriangle(26, 18, 28, 28, 40, 4);
      g.fillTriangle(54, 18, 52, 28, 40, 4);
      g.fillStyle(0x040c08, 1); g.fillRoundedRect(30, 22, 20, 10, 3); // маска
      g.fillStyle(0x00ff55, 1); g.fillCircle(35, 27, 3); g.fillCircle(45, 27, 3); // глаза
      g.fillStyle(0xccffcc, 1); g.fillCircle(35, 27, 1); g.fillCircle(45, 27, 1);
      g.lineStyle(2.5, 0x88ffaa, 1); g.lineBetween(22, 63, 5, 38);  // левый клинок
      g.lineStyle(1, 0xccffdd, 1);   g.lineBetween(21, 63, 4, 38);
      g.lineStyle(3, 0x1a4a1a, 1);   g.lineBetween(28, 65, 22, 65); // рукоять л
      g.lineStyle(2.5, 0x88ffaa, 1); g.lineBetween(58, 63, 75, 38); // правый клинок
      g.lineStyle(3, 0x1a4a1a, 1);   g.lineBetween(52, 65, 58, 65); // рукоять п

    } else if (type === 'crit') {
      // === ХАОС-РЫЦАРЬ: тёмно-фиолетовый, рога, зазубренный меч наискосок ===
      g.fillStyle(bc, 1);
      g.fillRect(31, 80, 12, 34); g.fillRect(45, 80, 12, 34);
      g.fillRoundedRect(25, 42, 30, 40, 8);
      g.lineStyle(1, 0xff44aa, 0.8);                              // символ хаоса
      g.lineBetween(35, 50, 45, 50); g.lineBetween(40, 44, 40, 56);
      g.lineBetween(35, 44, 45, 56); g.lineBetween(45, 44, 35, 56);
      g.fillStyle(sc, 1); g.fillRoundedRect(15, 40, 13, 12, 3); g.fillRoundedRect(52, 40, 13, 12, 3); // наплечники
      g.fillStyle(0xaa44ff, 1);                                   // шипы плечей
      g.fillTriangle(21, 40, 19, 31, 23, 40); g.fillTriangle(59, 40, 57, 31, 61, 40);
      g.fillStyle(bc, 1); g.fillCircle(40, 28, 16);              // голова
      g.fillStyle(sc, 1); g.fillRect(24, 13, 32, 14);            // шлем
      g.lineStyle(4, 0xff44aa, 1);                                // рога хаоса
      g.lineBetween(28, 13, 18, 4); g.lineBetween(28, 13, 22, 2);
      g.lineBetween(52, 13, 62, 4); g.lineBetween(52, 13, 58, 2);
      g.fillStyle(0x0a0010, 0.9); g.fillRoundedRect(28, 20, 24, 12, 3); // маска
      g.fillStyle(0xff44aa, 1); g.fillCircle(34, 26, 3); g.fillCircle(46, 26, 3);
      g.fillStyle(0xffaadd, 1); g.fillCircle(34, 26, 1); g.fillCircle(46, 26, 1);
      // зазубренный меч по диагонали (от нижнего-правого к верхнему-левому)
      g.lineStyle(14, 0x8800ff, 0.18); g.lineBetween(74, 110, 10, 18); // свечение
      g.lineStyle(8, 0xff44aa, 0.15);  g.lineBetween(74, 110, 10, 18);
      g.lineStyle(5, 0x6622aa, 1);     g.lineBetween(74, 110, 10, 18); // тело клинка
      g.lineStyle(1.5, 0xcc88ff, 1);   g.lineBetween(74, 110, 10, 18); // блик
      // зазубрины
      const [x1, y1, x2, y2] = [74, 110, 10, 18];
      const ln = Math.sqrt((x2-x1)**2+(y2-y1)**2);
      const [dx, dy] = [(x2-x1)/ln, (y2-y1)/ln], [px, py2] = [-dy, dx];
      g.lineStyle(3, 0xff44aa, 0.8);
      for (let t = 0.18; t < 0.88; t += 0.11) {
        const [mx, my] = [x1+(x2-x1)*t, y1+(y2-y1)*t], s = (Math.floor(t*9)%2===0)?6:-6;
        g.lineBetween(mx, my, mx+px*s, my+py2*s);
      }
      g.lineStyle(4, 0xffcc44, 1); // гарда
      const [cgx, cgy] = [x1+(x2-x1)*0.25, y1+(y2-y1)*0.25];
      g.lineBetween(cgx+px*14, cgy+py2*14, cgx-px*14, cgy-py2*14);
      g.fillStyle(bc, 1); // кулаки
      g.fillCircle(x1+(x2-x1)*0.14, y1+(y2-y1)*0.14, 6);
      g.fillCircle(x1+(x2-x1)*0.22, y1+(y2-y1)*0.22, 6);

    } else {
      // === ЛЕГИОНЕР: бронза/зелёный, римский шлем, щит, гладиус ===
      g.fillStyle(bc, 1);
      g.fillRect(30, 80, 12, 34); g.fillRect(48, 80, 12, 34);
      g.fillRoundedRect(24, 42, 32, 40, 8);
      g.lineStyle(1.5, 0xcd7f32, 0.7); // пластины брони
      g.lineBetween(26, 50, 54, 50); g.lineBetween(26, 58, 54, 58);
      g.lineBetween(26, 66, 54, 66); g.lineBetween(26, 74, 54, 74);
      g.fillStyle(0x1a3a22, 1); g.fillRoundedRect(4, 42, 18, 30, 4); // щит
      g.lineStyle(2, 0xcd7f32, 1); g.strokeRoundedRect(4, 42, 18, 30, 4);
      g.lineStyle(1.5, 0xcd7f32, 1); // орёл на щите
      g.lineBetween(13, 47, 13, 67); g.lineBetween(7, 55, 19, 55);
      g.lineBetween(8, 50, 13, 55); g.lineBetween(18, 50, 13, 55);
      g.fillStyle(bc, 1); g.fillCircle(40, 28, 15);              // голова
      g.fillStyle(0xcd7f32, 1); g.fillRect(26, 13, 28, 14);      // шлем
      g.fillStyle(0xcc2222, 1); g.fillTriangle(30, 13, 40, 5, 50, 13); // гребень
      g.fillStyle(0xcd7f32, 1);
      g.fillRect(26, 24, 8, 10); g.fillRect(46, 24, 8, 10);      // нащёчники
      g.fillStyle(0xffffff, 1); g.fillCircle(37, 28, 3.5); g.fillCircle(45, 28, 3.5); // глаза
      g.fillStyle(0x1a1a1a, 1); g.fillCircle(38, 28, 1.5); g.fillCircle(46, 28, 1.5);
      g.lineStyle(3, 0x886633, 1); g.lineBetween(62, 58, 62, 76); // рукоять
      g.lineStyle(2, 0xcd7f32, 1); g.lineBetween(56, 60, 68, 60); // гарда
      g.fillStyle(0xccccaa, 1); g.fillTriangle(58, 56, 66, 56, 62, 28); // клинок
      g.lineStyle(1, 0xeeeedd, 1); g.lineBetween(62, 55, 62, 30);       // блик
    }

    rt.draw(g, 0, 0);
    rt.saveTexture(key);
    g.destroy(); rt.destroy();
  },

  _wtFace(key, bc, type) {
    const S = 56;
    const rt = this.add.renderTexture(0, 0, S, S).setVisible(false);
    const g  = this.add.graphics().setVisible(false);

    g.fillStyle(bc, 1); g.fillRoundedRect(8, 36, 40, 22, 8); // плечи

    if (type === 'tank') {
      g.fillStyle(0x881111, 1); g.fillRoundedRect(10, 38, 36, 12, 4); // броня груди
      g.fillStyle(bc, 1); g.fillCircle(28, 22, 15);
      g.fillStyle(0x881111, 1); g.fillRect(13, 9, 30, 10);
      g.fillStyle(0xcc9933, 1); // рога
      g.fillTriangle(16, 9, 10, 1, 6, 9); g.fillTriangle(40, 9, 46, 9, 50, 1);
      g.fillStyle(0xff2200, 1); g.fillCircle(21, 22, 4); g.fillCircle(35, 22, 4);
      g.fillStyle(0xff8800, 1); g.fillCircle(22, 22, 1.5); g.fillCircle(36, 22, 1.5);
      g.lineStyle(3, 0x886633, 1); g.lineBetween(46, 34, 55, 18);      // топор
      g.fillStyle(0xaabbcc, 1); g.fillTriangle(50, 15, 56, 9, 56, 23);

    } else if (type === 'agile') {
      g.fillStyle(0x062010, 1); // плащ
      g.fillTriangle(8, 36, 0, 56, 8, 50); g.fillTriangle(48, 36, 56, 56, 48, 50);
      g.fillStyle(bc, 1); g.fillCircle(28, 22, 14);
      g.fillStyle(0x062010, 1); // капюшон
      g.fillTriangle(14, 14, 28, 22, 42, 14);
      g.fillTriangle(14, 14, 16, 22, 28, 4); g.fillTriangle(42, 14, 40, 22, 28, 4);
      g.fillStyle(0x040c08, 1); g.fillRoundedRect(18, 18, 20, 8, 2);
      g.fillStyle(0x00ff55, 1); g.fillCircle(22, 22, 3); g.fillCircle(34, 22, 3);
      g.fillStyle(0xccffcc, 1); g.fillCircle(22, 22, 1); g.fillCircle(34, 22, 1);
      g.lineStyle(1.5, 0x88ffaa, 1); g.lineBetween(2, 34, 14, 22); g.lineBetween(54, 34, 42, 22);

    } else if (type === 'crit') {
      g.fillStyle(0xaa44ff, 1); // шипы плечей
      g.fillTriangle(8, 36, 6, 28, 10, 36); g.fillTriangle(48, 36, 46, 28, 50, 36);
      g.fillStyle(bc, 1); g.fillCircle(28, 22, 15);
      g.fillStyle(0x1a0030, 1); g.fillRect(13, 9, 30, 12);
      g.lineStyle(3, 0xff44aa, 1); // рога
      g.lineBetween(16, 9, 8, 1); g.lineBetween(40, 9, 48, 1);
      g.fillStyle(0x0a0010, 0.9); g.fillRoundedRect(16, 17, 24, 9, 2);
      g.fillStyle(0xff44aa, 1); g.fillCircle(21, 21, 3); g.fillCircle(35, 21, 3);
      g.fillStyle(0xffaadd, 1); g.fillCircle(21, 21, 1); g.fillCircle(35, 21, 1);
      g.lineStyle(3, 0x6622aa, 1); g.lineBetween(48, 56, 55, 20); // меч
      g.lineStyle(1.5, 0xcc88ff, 1); g.lineBetween(47, 56, 54, 20);

    } else { // neutral
      g.fillStyle(0x1a3a22, 1); g.fillRoundedRect(2, 34, 14, 18, 3); // щит
      g.lineStyle(1.5, 0xcd7f32, 1); g.strokeRoundedRect(2, 34, 14, 18, 3);
      g.lineStyle(1.5, 0xaaaaaa, 1); g.lineBetween(44, 34, 55, 18); // меч
      g.fillStyle(bc, 1); g.fillCircle(28, 22, 14);
      g.fillStyle(0xcd7f32, 1); g.fillRect(14, 9, 28, 12);
      g.fillStyle(0xcc2222, 1); g.fillTriangle(18, 9, 28, 3, 38, 9); // гребень
      g.fillStyle(0xcd7f32, 1);
      g.fillRect(14, 19, 6, 8); g.fillRect(36, 19, 6, 8); // нащёчники
      g.fillStyle(0xffffff, 1); g.fillCircle(23, 24, 3); g.fillCircle(33, 24, 3);
      g.fillStyle(0x222222, 1); g.fillCircle(24, 24, 1.5); g.fillCircle(34, 24, 1.5);
    }

    rt.draw(g, 0, 0);
    rt.saveTexture(key);
    g.destroy(); rt.destroy();
  },

});
