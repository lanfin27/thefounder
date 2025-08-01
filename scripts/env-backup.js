// Environment file backup and restore utility
const fs = require('fs');
const path = require('path');

class EnvBackup {
  constructor() {
    this.envPath = path.join(process.cwd(), '.env.local');
    this.backupPath = path.join(process.cwd(), '.env.local.backup');
    this.timestampBackupPath = path.join(
      process.cwd(), 
      `.env.local.backup.${new Date().toISOString().replace(/[:.]/g, '-')}`
    );
  }

  backup() {
    try {
      if (fs.existsSync(this.envPath)) {
        // Create both regular and timestamped backups
        fs.copyFileSync(this.envPath, this.backupPath);
        fs.copyFileSync(this.envPath, this.timestampBackupPath);
        console.log('✅ .env.local 백업 완료');
        console.log(`   - 기본 백업: ${this.backupPath}`);
        console.log(`   - 타임스탬프 백업: ${this.timestampBackupPath}`);
        return true;
      } else {
        console.log('⚠️ .env.local 파일이 존재하지 않습니다.');
        return false;
      }
    } catch (error) {
      console.error('❌ 백업 실패:', error.message);
      return false;
    }
  }

  restore() {
    try {
      if (fs.existsSync(this.backupPath)) {
        fs.copyFileSync(this.backupPath, this.envPath);
        console.log('✅ .env.local 복원 완료');
        return true;
      } else {
        console.log('⚠️ 백업 파일이 존재하지 않습니다.');
        return false;
      }
    } catch (error) {
      console.error('❌ 복원 실패:', error.message);
      return false;
    }
  }

  updateRedisConfig(config) {
    try {
      this.backup(); // Backup first
      
      let envContent = '';
      if (fs.existsSync(this.envPath)) {
        envContent = fs.readFileSync(this.envPath, 'utf8');
      }

      // Remove old Redis configuration
      const lines = envContent.split('\n');
      const filteredLines = lines.filter(line => 
        !line.startsWith('REDIS_URL') && 
        !line.startsWith('REDIS_HOST') && 
        !line.startsWith('REDIS_PORT') && 
        !line.startsWith('REDIS_PASSWORD') && 
        !line.startsWith('REDIS_DB') &&
        !line.startsWith('QUEUE_REDIS_') &&
        !line.includes('Redis Configuration') &&
        !line.includes('Job Queue Settings')
      );

      // Add new Redis configuration
      const redisConfigLines = [
        '',
        '# Redis Configuration (Updated automatically)',
        `REDIS_URL=${config.REDIS_URL}`,
        `REDIS_HOST=${config.REDIS_HOST}`,
        `REDIS_PORT=${config.REDIS_PORT}`,
        `REDIS_PASSWORD=${config.REDIS_PASSWORD}`,
        `REDIS_DB=${config.REDIS_DB || '0'}`,
        '',
        '# Job Queue Settings',
        `QUEUE_REDIS_HOST=${config.REDIS_HOST}`,
        `QUEUE_REDIS_PORT=${config.REDIS_PORT}`,
        `QUEUE_REDIS_DB=${config.QUEUE_REDIS_DB || '1'}`,
        ''
      ];

      const newContent = [...filteredLines, ...redisConfigLines].join('\n');
      fs.writeFileSync(this.envPath, newContent, 'utf8');
      
      console.log('✅ Redis 설정 업데이트 완료');
      return true;
    } catch (error) {
      console.error('❌ 설정 업데이트 실패:', error.message);
      this.restore(); // Restore backup on failure
      return false;
    }
  }

  listBackups() {
    try {
      const files = fs.readdirSync(process.cwd());
      const backups = files.filter(file => file.startsWith('.env.local.backup'));
      
      console.log('📋 사용 가능한 백업 파일:');
      backups.forEach(backup => {
        const stats = fs.statSync(path.join(process.cwd(), backup));
        console.log(`   - ${backup} (${new Date(stats.mtime).toLocaleString()})`);
      });
      
      return backups;
    } catch (error) {
      console.error('❌ 백업 목록 조회 실패:', error.message);
      return [];
    }
  }

  diff() {
    try {
      if (!fs.existsSync(this.envPath) || !fs.existsSync(this.backupPath)) {
        console.log('⚠️ 비교할 파일이 존재하지 않습니다.');
        return false;
      }

      const current = fs.readFileSync(this.envPath, 'utf8');
      const backup = fs.readFileSync(this.backupPath, 'utf8');

      if (current === backup) {
        console.log('✅ 현재 파일과 백업이 동일합니다.');
      } else {
        console.log('⚠️ 현재 파일과 백업이 다릅니다.');
        
        const currentLines = current.split('\n');
        const backupLines = backup.split('\n');
        
        console.log('\n변경된 내용:');
        
        // Find differences
        const maxLines = Math.max(currentLines.length, backupLines.length);
        for (let i = 0; i < maxLines; i++) {
          if (currentLines[i] !== backupLines[i]) {
            if (backupLines[i] !== undefined) {
              console.log(`- ${backupLines[i] || '(empty line)'}`);
            }
            if (currentLines[i] !== undefined) {
              console.log(`+ ${currentLines[i] || '(empty line)'}`);
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ 파일 비교 실패:', error.message);
      return false;
    }
  }
}

// CLI usage
if (require.main === module) {
  const envBackup = new EnvBackup();
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'backup':
      envBackup.backup();
      break;
    case 'restore':
      envBackup.restore();
      break;
    case 'list':
      envBackup.listBackups();
      break;
    case 'diff':
      envBackup.diff();
      break;
    default:
      console.log('사용법:');
      console.log('  node scripts/env-backup.js backup   - 백업 생성');
      console.log('  node scripts/env-backup.js restore  - 백업 복원');
      console.log('  node scripts/env-backup.js list     - 백업 목록');
      console.log('  node scripts/env-backup.js diff     - 변경사항 확인');
  }
}

module.exports = EnvBackup;