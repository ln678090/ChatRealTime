package com.java5.asm.entity;

import com.java5.asm.dto.enumclass.MessageContentType;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.OffsetDateTime;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Entity
@Table(name = "messages")
public class Message {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "message_id", nullable = false)
    private Long id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    @JoinColumn(name = "conversation_id", nullable = false)
    private Conversation conversation;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @OnDelete(action = OnDeleteAction.RESTRICT)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(name = "content", length = Integer.MAX_VALUE)
    private String content; // Null nếu là file/ảnh only

    @Size(max = 500)
    @Column(name = "media_url", length = 500)
    private String mediaUrl;

   
    @NotNull
    @ColumnDefault("'TEXT'")
    @Column(name = "message_type", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private MessageContentType messageType;

    @Size(max = 20)
    @NotNull
    @ColumnDefault("'SENT'")
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @NotNull
    @ColumnDefault("now()")
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
    @Column(name = "attachment_url", length = Integer.MAX_VALUE)
    private String attachmentUrl;
    @Size(max = 50)
    @Column(name = "attachment_type", length = 50)
    private String attachmentType;
    @Size(max = 255)
    @Column(name = "attachment_name")
    private String attachmentName;
    @Column(name = "attachment_size")
    private Long attachmentSize;


}