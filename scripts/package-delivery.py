"""Empaqueta fuentes y documentación, excluyendo secretos y dependencias locales."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(__file__).resolve().parent.parent
out=root/'entrega';out.mkdir(exist_ok=True)
excluded_dirs={'node_modules','dist','coverage','.git','.dependency-resolve','entrega','test-results','playwright-report','__pycache__'}
excluded_files={'audit-runtime.json','accessibility-check.json','enunciado-extraido.txt'}
with ZipFile(out/'Conserva-P3.zip','w',ZIP_DEFLATED) as z:
 for path in root.rglob('*'):
  if not path.is_file():continue
  relative=path.relative_to(root)
  if any(part in excluded_dirs for part in relative.parts):continue
  if path.name in excluded_files or path.name.endswith(('.log','.dump')):continue
  if path.name.startswith('.env') and path.name!='.env.example':continue
  z.write(path,Path('Conserva-P3')/relative)
print('entrega/Conserva-P3.zip')
