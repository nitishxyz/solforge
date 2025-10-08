import * as spl from '@solana/spl-token';

const keys = Object.keys(spl).filter(k => 
    k.toLowerCase().includes('reallocate') || 
    k.toLowerCase().includes('interest') ||
    k.toLowerCase().includes('transferhook') ||
    k.toLowerCase().includes('metadata') ||
    k.toLowerCase().includes('group')
);
console.log('Extension related exports:\n');
console.log(keys.join('\n'));
