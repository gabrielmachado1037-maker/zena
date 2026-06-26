@echo off
echo.
echo  ============================================
echo   ZENA - seu consultorio. simplificado.
echo  ============================================
echo.
echo  Iniciando backend na porta 3001...
start "Zena Backend" cmd /k "cd /d "%~dp0backend" && npx ts-node src/index.ts"
timeout /t 3 /nobreak >nul

echo  Iniciando frontend na porta 5173...
start "Zena Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 4 /nobreak >nul

echo.
echo  Abrindo no navegador...
start http://localhost:5173

echo.
echo  ZENA rodando!
echo  - App: http://localhost:5173
echo  - API: http://localhost:3001
echo  - Login demo: ana@zena.app / zena123
echo.
pause
