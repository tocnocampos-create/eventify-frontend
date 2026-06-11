import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Mail, KeyRound, Lock } from 'lucide-react-native';
import colors from '../theme/colors';
import GlowingBackground from '../components/auth/GlowingBackground';
import StyledInput from '../components/auth/StyledInput';
import GradientButton from '../components/auth/GradientButton';
import { forgotPasswordApi, resetPasswordApi } from '../services/auth';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [successMessage, setSuccessMessage] = useState('');

  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const contentTranslateY = contentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const forgotMutation = useMutation({
    mutationFn: () => forgotPasswordApi({ email: email.trim().toLowerCase() }),
    onSuccess: () => {
      setStep('reset');
    },
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      resetPasswordApi({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        new_password: newPassword,
      }),
    onSuccess: () => {
      setSuccessMessage('¡Contraseña actualizada! Ya puedes iniciar sesión.');
    },
  });

  const getErrorMessage = (error) => {
    if (error?.response?.status === 404) {
      return 'No encontramos una cuenta con ese correo';
    }
    if (error?.response?.status === 400) {
      return 'Código inválido o expirado';
    }
    if (error?.message === 'Network Error' || !error?.response) {
      return 'Error de conexión. Verifica tu internet';
    }
    return 'Ocurrió un error. Intenta de nuevo';
  };

  if (successMessage) {
    return (
      <GlowingBackground>
        <View style={styles.container}>
          <Animated.View
            style={[styles.formContainer, { opacity: contentAnim, transform: [{ translateY: contentTranslateY }] }]}
          >
            <Text style={styles.title}>¡Listo!</Text>
            <Text style={styles.successText}>{successMessage}</Text>
            <GradientButton
              title="Iniciar Sesión"
              onPress={() => navigation.navigate('Login')}
            />
          </Animated.View>
        </View>
      </GlowingBackground>
    );
  }

  return (
    <GlowingBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[styles.formContainer, { opacity: contentAnim, transform: [{ translateY: contentTranslateY }] }]}
          >
            <Text style={styles.title}>
              {step === 'email' ? 'Recuperar contraseña' : 'Nueva contraseña'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'email'
                ? 'Ingresa tu correo y te generaremos un código de recuperación.'
                : 'Ingresa el código que recibiste y tu nueva contraseña.'}
            </Text>

            {(forgotMutation.isError || resetMutation.isError) && (
              <Text style={styles.errorText}>
                {getErrorMessage(forgotMutation.error || resetMutation.error)}
              </Text>
            )}

            {step === 'email' ? (
              <>
                <StyledInput
                  icon={Mail}
                  placeholder="Correo"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!forgotMutation.isPending}
                />
                <GradientButton
                  title="Enviar código"
                  onPress={() => {
                    if (email.trim()) forgotMutation.mutate();
                  }}
                  loading={forgotMutation.isPending}
                />
              </>
            ) : (
              <>
                <StyledInput
                  icon={KeyRound}
                  placeholder="Código de 6 dígitos"
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!resetMutation.isPending}
                />
                <StyledInput
                  icon={Lock}
                  placeholder="Nueva contraseña"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  editable={!resetMutation.isPending}
                />
                <GradientButton
                  title="Cambiar contraseña"
                  onPress={() => {
                    if (code.trim() && newPassword.length >= 8) resetMutation.mutate();
                  }}
                  loading={resetMutation.isPending}
                />
              </>
            )}

            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backText}>← Volver al inicio de sesión</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GlowingBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    color: '#fff',
    fontFamily: 'Outfit_700Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorText: {
    color: colors.authError,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  backButton: {
    marginTop: 20,
  },
  backText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
  },
});
