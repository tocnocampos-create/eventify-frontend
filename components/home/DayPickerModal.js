import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, CircleCheck, PlusCircle } from 'lucide-react-native';
import colors from '../../theme/colors';
import dayjs from 'dayjs';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DAY_ITEM_HEIGHT = 48;
const DAYS_AHEAD = 365;

export default function DayPickerModal({
  visible,
  tempSelectedDays,
  currentDate,
  onClose,
  onDayToggle,
  onClear,
  onApply,
}) {
  const dayItems = useMemo(() => {
    const start = dayjs().startOf('day');
    return Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => start.add(i, 'day'));
  }, []);

  const dayIndexFor = (d) => {
    const start = dayjs().startOf('day');
    const diff = d.startOf('day').diff(start, 'day');
    return diff < 0 ? 0 : diff > DAYS_AHEAD ? DAYS_AHEAD : diff;
  };

  const initialDayIndex = useMemo(() => dayIndexFor(currentDate), [currentDate]);

  const headerText = tempSelectedDays.length === 0
    ? 'Selecciona d\u00EDas'
    : tempSelectedDays.length === 1
    ? dayjs(tempSelectedDays[0]).format('DD MMM')
    : `${tempSelectedDays.length} d\u00EDas seleccionados`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View />
      </TouchableOpacity>
      <View style={styles.sheet}>
        <LinearGradient
          colors={[colors.authBg, colors.authBgDeep]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.header}>
          <Text style={styles.title}>{headerText}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={dayItems}
          keyExtractor={(d) => d.format('YYYY-MM-DD')}
          renderItem={({ item }) => {
            const dateStr = item.format('YYYY-MM-DD');
            const isSelected = tempSelectedDays.includes(dateStr);
            return (
              <View style={[styles.dayRow, isSelected && styles.dayRowSelected]}>
                <Text style={[styles.dayText, isSelected && styles.dayTextBold]}>
                  {item.format('ddd DD MMM YYYY')}
                </Text>
                <TouchableOpacity
                  style={styles.dayBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDayToggle(item);
                  }}
                >
                  {isSelected
                    ? <CircleCheck size={24} color={colors.authGradientStart} />
                    : <PlusCircle size={24} color="#fff" />
                  }
                </TouchableOpacity>
              </View>
            );
          }}
          showsVerticalScrollIndicator={false}
          initialScrollIndex={initialDayIndex}
          getItemLayout={(data, index) => ({
            length: DAY_ITEM_HEIGHT,
            offset: DAY_ITEM_HEIGHT * index,
            index,
          })}
        />

        <View style={styles.footer}>
          <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
            <Text style={styles.btnText}>Limpiar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onApply}>
            <LinearGradient
              colors={[colors.authGradientStart, colors.authGradientEnd]}
              style={styles.applyBtn}
            >
              <Text style={styles.applyText}>Aplicar</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.6,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Outfit_700Bold',
  },
  closeBtn: {
    padding: 6,
  },
  dayRow: {
    height: DAY_ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dayRowSelected: {
    backgroundColor: colors.glassLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  dayText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Outfit_400Regular',
    flex: 1,
  },
  dayTextBold: {
    fontFamily: 'Outfit_600SemiBold',
  },
  dayBtn: {
    padding: 4,
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.glassLight,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit_600SemiBold',
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
});
