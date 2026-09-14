import React, {forwardRef, useState} from 'react';
import {TextInput, useWindowDimensions, type TextInputProps} from 'react-native';
import {assets} from './assets';
import {PixelFrame} from './PixelFrame';

type Props = Omit<TextInputProps, 'style' | 'multiline'> & {
  width: number;
  /** Minimum outer height; grows when accessible text needs more room. */
  height?: number;
  error?: boolean;
};

/** Single-line field. The frame owns padding; the native editor owns its baseline. */
export const PixelInput = forwardRef<TextInput, Props>(function PixelInput({
  width, height=48, error=false, editable=true, onFocus, onBlur,
  allowFontScaling=true, maxFontSizeMultiplier, placeholderTextColor='#8C9CAF', ...props
}, ref) {
  const [focused, setFocused] = useState(false);
  const {fontScale} = useWindowDimensions();
  const effectiveScale = allowFontScaling
    ? Math.min(fontScale, maxFontSizeMultiplier && maxFontSizeMultiplier >= 1
      ? maxFontSizeMultiplier : Infinity) : 1;
  const asset = !editable ? assets.input_disabled_9slice : error ? assets.input_error_9slice
    : focused ? assets.input_focused_9slice : assets.input_default_9slice;
  const fieldHeight = Math.max(height, asset.height,
    asset.padding.top + asset.padding.bottom + Math.ceil(24 * effectiveScale));
  return <PixelFrame asset={asset} width={width} height={fieldHeight}>
    <TextInput {...props} ref={ref} editable={editable} multiline={false}
      allowFontScaling={allowFontScaling} maxFontSizeMultiplier={maxFontSizeMultiplier}
      placeholderTextColor={placeholderTextColor} underlineColorAndroid="transparent"
      onFocus={event=>{setFocused(true);onFocus?.(event);}}
      onBlur={event=>{setFocused(false);onBlur?.(event);}}
      style={{flex:1, minWidth:0, padding:0, margin:0, borderWidth:0,
        backgroundColor:'transparent', color:editable?'#EADCC5':'#8C9CAF', fontSize:16,
        textAlignVertical:'center', includeFontPadding:false}}/>
  </PixelFrame>;
});
