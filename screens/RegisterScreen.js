import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { User, Mail, Lock } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import colors from '../theme/colors';
import GlowingBackground from '../components/auth/GlowingBackground';
import StyledInput from '../components/auth/StyledInput';
import GradientButton from '../components/auth/GradientButton';

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const { register } = useAuth();

  const logoAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.spring(logoAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const registerMutation = useMutation({
    mutationFn: () => register(email, fullName, password),
  });

  const handleRegister = () => {
    setValidationError('');

    if (!fullName.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setValidationError('Todos los campos son obligatorios');
      return;
    }

    if (password.length < 6) {
      setValidationError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Las contraseñas no coinciden');
      return;
    }

    registerMutation.mutate();
  };

  const getErrorMessage = (error) => {
    if (
      error?.response?.status === 400 ||
      error?.response?.data?.detail?.toLowerCase?.().includes('already')
    ) {
      return 'Ya existe una cuenta con este correo';
    }
    if (error?.response?.status === 422) {
      return 'Por favor verifica los datos ingresados';
    }
    if (error?.message === 'Network Error' || !error?.response) {
      return 'Error de conexión. Verifica tu internet';
    }
    return 'Ocurrió un error. Intenta de nuevo';
  };

  const displayError = validationError || (registerMutation.isError ? getErrorMessage(registerMutation.error) : '');
  const isPending = registerMutation.isPending;

  const logoScale = logoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const contentTranslateY = contentAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <GlowingBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.logoContainer,
              { opacity: logoAnim, transform: [{ scale: logoScale }] },
            ]}
          >
            <Image source={require('../assets/logo.png')} style={styles.logo} />
            <Text style={styles.title}>Crear cuenta</Text>
            <Text style={styles.subtitle}>Únete a Eventify y descubre eventos</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formContainer,
              { opacity: contentAnim, transform: [{ translateY: contentTranslateY }] },
            ]}
          >
            {displayError !== '' && (
              <Text style={styles.errorText}>{displayError}</Text>
            )}

            <StyledInput
              icon={User}
              placeholder="Nombre completo"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!isPending}
            />

            <StyledInput
              icon={Mail}
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isPending}
            />

            <StyledInput
              icon={Lock}
              placeholder="Contraseña"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!isPending}
            />

            <StyledInput
              icon={Lock}
              placeholder="Confirmar contraseña"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isPending}
            />

            <GradientButton
              title="Registrarme"
              onPress={handleRegister}
              loading={isPending}
            />

            <Text style={styles.loginText}>
              ¿Ya tienes una cuenta?{' '}
              <Text style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
                Iniciar Sesión
              </Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GlowingBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: 12,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    color: '#fff',
    fontFamily: 'Poppins_700Bold',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 4,
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  errorText: {
    color: colors.authError,
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  loginText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 24,
    fontSize: 13,
  },
  loginLink: {
    color: '#BFA0FF',
    fontWeight: 'bold',
  },
});
