@echo off
echo Cleaning Next.js build directories...

cd /d "C:\Users\KIMJAEHEON\the-founder"

echo Removing .next directory...
if exist .next (
    rmdir /s /q .next
    echo .next directory removed
) else (
    echo .next directory not found
)

echo Removing node_modules\.cache...
if exist node_modules\.cache (
    rmdir /s /q node_modules\.cache
    echo node_modules\.cache removed
) else (
    echo node_modules\.cache not found
)

echo Creating fresh .next directory...
mkdir .next

echo Clean complete!
echo Now run: npm run build