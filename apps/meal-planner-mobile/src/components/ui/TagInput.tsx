import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import { Button } from './Button';
import { Chip } from './Chip';
import { TextField } from './TextField';

type TagInputProps = {
  label: string;
  placeholder: string;
  value: string[];
  onChange: (value: string[]) => void;
  /** Quick-pick options shown as chips; custom entries appear alongside them. */
  suggestions?: readonly string[];
};

const sameTag = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function TagInput({ label, placeholder, value, onChange, suggestions = [] }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const toggle = (tag: string) =>
    onChange(value.some((t) => sameTag(t, tag)) ? value.filter((t) => !sameTag(t, tag)) : [...value, tag]);

  const addDraft = () => {
    const text = draft.trim();
    if (!text) return;
    const canonical = suggestions.find((s) => sameTag(s, text)) ?? text;
    if (!value.some((t) => sameTag(t, canonical))) onChange([...value, canonical]);
    setDraft('');
  };

  const custom = value.filter((tag) => !suggestions.some((s) => sameTag(s, tag)));

  return (
    <View style={styles.wrapper}>
      {(suggestions.length > 0 || custom.length > 0) && (
        <View style={styles.chips}>
          {[...suggestions, ...custom].map((tag) => (
            <Chip key={tag} label={tag} selected={value.some((t) => sameTag(t, tag))} onPress={() => toggle(tag)} />
          ))}
        </View>
      )}
      <View style={styles.inputRow}>
        <View style={styles.input}>
          <TextField
            label={label}
            placeholder={placeholder}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={addDraft}
            maxLength={40}
            returnKeyType="done"
            blurOnSubmit={false}
          />
        </View>
        <Button title="Add" variant="secondary" onPress={addDraft} disabled={!draft.trim()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: { flex: 1 },
});
