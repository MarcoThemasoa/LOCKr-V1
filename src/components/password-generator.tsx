'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Copy, RefreshCw } from 'lucide-react';

interface PasswordGeneratorProps {
  onPasswordGenerated: (password: string) => void;
}

export function PasswordGenerator({ onPasswordGenerated }: PasswordGeneratorProps) {
  const [length, setLength] = useState(16);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const { toast } = useToast();

  const generatePassword = () => {
    const lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    const upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numberChars = '0123456789';
    const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let charPool = lowerChars;
    if (includeUppercase) charPool += upperChars;
    if (includeNumbers) charPool += numberChars;
    if (includeSymbols) charPool += symbolChars;
    
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charPool.length);
      password += charPool[randomIndex];
    }
    setGeneratedPassword(password);
    onPasswordGenerated(password);
  };
  
  const handleCopy = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      toast({ title: "Password copied to clipboard!" });
    }
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <h4 className="font-medium">Password Generator</h4>
      <div className="flex items-center justify-between">
        <Label htmlFor="length">Length: {length}</Label>
        <Slider
          id="length"
          min={8}
          max={64}
          step={1}
          value={[length]}
          onValueChange={(value) => setLength(value[0])}
          className="w-48"
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox id="uppercase" checked={includeUppercase} onCheckedChange={(c) => setIncludeUppercase(Boolean(c.valueOf()))} />
          <Label htmlFor="uppercase">Uppercase</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="numbers" checked={includeNumbers} onCheckedChange={(c) => setIncludeNumbers(Boolean(c.valueOf()))} />
          <Label htmlFor="numbers">Numbers</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="symbols" checked={includeSymbols} onCheckedChange={(c) => setIncludeSymbols(Boolean(c.valueOf()))} />
          <Label htmlFor="symbols">Symbols</Label>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={generatedPassword} placeholder="Click Generate" className="font-code flex-auto"/>
        <Button type="button" variant="ghost" size="icon" onClick={handleCopy} disabled={!generatedPassword}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button type="button" variant="secondary" onClick={generatePassword} className="flex-auto sm:flex-initial">
            <RefreshCw className="mr-2 h-4 w-4"/> Generate
        </Button>
      </div>
    </div>
  );
}
