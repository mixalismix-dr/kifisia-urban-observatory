from pathlib import Path
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QImage, QPainter
from PyQt5.QtSvg import QSvgRenderer

root = Path(__file__).resolve().parents[1] / 'public'
renderer = QSvgRenderer(str(root / 'bus-3d.svg'))
image = QImage(224, 168, QImage.Format_ARGB32_Premultiplied)
image.fill(Qt.transparent)
painter = QPainter(image)
renderer.render(painter)
painter.end()
assert image.save(str(root / 'bus-3d.png'))
